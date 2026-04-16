#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动点OA助手

功能：
1. 打开 OA 待办列表页，手动登录后按回车启动
2. 自动点击“已阅”（可覆盖约 95% OA）
3. 部分类型（如督办）可能点击失败，需人工处理后等待刷新
4. 支持无限模式 / 有限模式（可设置点击次数）
"""

import re
import time
from typing import Optional

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

try:
    from colorama import Fore, Style, init as colorama_init

    colorama_init(autoreset=True)

    def c_info(text: str) -> str:
        return f"{Fore.CYAN}{text}{Style.RESET_ALL}"

    def c_ok(text: str) -> str:
        return f"{Fore.GREEN}{text}{Style.RESET_ALL}"

    def c_warn(text: str) -> str:
        return f"{Fore.YELLOW}{text}{Style.RESET_ALL}"

    def c_err(text: str) -> str:
        return f"{Fore.RED}{text}{Style.RESET_ALL}"

except ImportError:

    def c_info(text: str) -> str:
        return text

    def c_ok(text: str) -> str:
        return text

    def c_warn(text: str) -> str:
        return text

    def c_err(text: str) -> str:
        return text


OA_LIST_URL = "https://work.csair.com/oaw/work/my-dealt-with/schedule-list"
OA_WAIT_LIST_URL = "https://work.csair.com/oaw/work/my-dealt-with/schedule-list?sourceType=wait"
ROW_SELECTOR = "td.table-file-title, td[class*='table-file-title']"
READ_TEXT_PATTERN = re.compile(r"已阅")
POLL_INTERVAL_SECONDS = 3
EMPTY_RETRY_LIMIT_FINITE = 3
ROW_WAIT_TIMEOUT_MS = 9000
READ_WAIT_TIMEOUT_MS = 9000


def ask_mode():
    """
    返回:
    - mode: "infinite" 或 "finite"
    - limit: 有限模式点击次数，无限模式为 None
    """
    print(c_info("请选择模式:"))
    print("  1. 无限模式（持续轮询，按 Ctrl+C 停止）")
    print("  2. 有限模式（设置点击次数上限）")

    while True:
        mode_raw = input("输入模式 [1/2，默认1]: ").strip() or "1"
        if mode_raw == "1":
            return "infinite", None
        if mode_raw == "2":
            while True:
                limit_raw = input("请输入点击次数（正整数）: ").strip()
                if limit_raw.isdigit() and int(limit_raw) > 0:
                    return "finite", int(limit_raw)
                print(c_warn("输入无效，请输入正整数。"))
        print(c_warn("输入无效，请输入 1 或 2。"))


def ensure_list_page(page):
    """确保当前在待办列表页。"""
    if "schedule-list" not in page.url:
        page.goto(OA_LIST_URL, wait_until="domcontentloaded")


def wait_list_row_ready(page, timeout_ms: int = ROW_WAIT_TIMEOUT_MS) -> bool:
    """
    等待待办列表的“首条可点击元素”出现。
    返回:
    - True: 已出现可点击行
    - False: 在超时内未出现（可能确实无待办）
    """
    ensure_list_page(page)
    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=3000)
    except Exception:
        pass

    try:
        page.wait_for_selector(ROW_SELECTOR, state="visible", timeout=timeout_ms)
        return True
    except PlaywrightTimeoutError:
        return False


def bootstrap_open_oa(page):
    """
    先打开浏览器并进入 OA 页面。
    OA 会自动跳 IAM 登录/回调，这里只负责把入口页打开到位。
    """
    print(c_info("正在打开 OA 待办列表页面..."))
    page.goto(OA_WAIT_LIST_URL, wait_until="domcontentloaded")
    # 某些情况下首次打开会被重定向，二次进入可提升稳定性
    page.wait_for_timeout(800)
    if "work.csair.com/oaw" not in page.url:
        try:
            page.goto(OA_WAIT_LIST_URL, wait_until="domcontentloaded")
        except Exception:
            pass


def get_first_row_safe(page, retries: int = 6):
    """
    稳定获取首条待办。
    处理 SSO/自动刷新期间的 Execution context 被销毁问题。
    """
    last_exc = None
    for _ in range(retries):
        try:
            has_row = wait_list_row_ready(page, timeout_ms=ROW_WAIT_TIMEOUT_MS)
            if not has_row:
                return None
            rows = page.locator(ROW_SELECTOR)
            row_count = rows.count()
            if row_count == 0:
                return None
            return rows.first
        except Exception as exc:
            last_exc = exc
            msg = str(exc)
            if "Execution context was destroyed" in msg or "Most likely the page has been closed" in msg:
                page.wait_for_timeout(500)
                continue
            page.wait_for_timeout(300)
    if last_exc:
        raise last_exc
    return None


def first_row_title(row_locator) -> str:
    """获取首条待办标题，仅用于日志。"""
    try:
        text = row_locator.inner_text(timeout=1200)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:120] if text else "(无标题)"
    except Exception:
        return "(标题读取失败)"


def click_read_button(popup) -> bool:
    """
    在弹窗页面（含 iframe）中查找并点击“已阅”按钮。
    """
    scopes = [popup] + [f for f in popup.frames if f != popup.main_frame]
    for scope in scopes:
        candidates = [
            scope.get_by_role("button", name=READ_TEXT_PATTERN),
            scope.locator("button:has-text('已阅')"),
            scope.locator("[role='button']:has-text('已阅')"),
            scope.get_by_text("已阅"),
        ]
        for loc in candidates:
            try:
                loc.first.wait_for(state="visible", timeout=1500)
                loc.first.click(timeout=3000)
                return True
            except Exception:
                continue
    # 最后一轮：在主弹窗里做一次更长等待
    try:
        final_btn = popup.locator("button:has-text('已阅'), [role='button']:has-text('已阅')").first
        final_btn.wait_for(state="visible", timeout=READ_WAIT_TIMEOUT_MS)
        final_btn.click(timeout=3000)
        return True
    except Exception:
        pass
    return False


def process_one(page) -> str:
    """
    处理一条待办。
    返回值: (状态, 首条标题)
    - done: 成功处理1条
    - empty: 没有可处理待办
    - failed: 本轮处理失败
    """
    first_row = get_first_row_safe(page)
    if first_row is None:
        return "empty", None

    title = first_row_title(first_row)
    print(c_info(f"准备处理首条待办: {title}"))

    try:
        first_row.wait_for(state="visible", timeout=5000)
        with page.expect_popup(timeout=10000) as popup_info:
            first_row.click(timeout=8000)
        popup = popup_info.value
    except PlaywrightTimeoutError:
        print(c_warn("点击首条待办后未检测到弹窗，刷新后重试。"))
        return "failed", title
    except Exception as exc:
        print(c_warn(f"点击首条待办失败: {exc}"))
        return "failed", title

    try:
        popup.wait_for_load_state("domcontentloaded", timeout=10000)
        clicked = click_read_button(popup)
        if not clicked:
            print(c_warn("弹窗内未找到“已阅”按钮。"))
            return "failed", title
        popup.wait_for_timeout(500)
        print(c_ok("已点击“已阅”。"))
        return "done", title
    except Exception as exc:
        print(c_warn(f"弹窗处理失败: {exc}"))
        return "failed", title
    finally:
        try:
            if not popup.is_closed():
                popup.close()
        except Exception:
            pass


def peek_first_row_title(page):
    """快速读取当前首条标题，不做长等待。"""
    try:
        ensure_list_page(page)
        rows = page.locator(ROW_SELECTOR)
        if rows.count() == 0:
            return None
        return first_row_title(rows.first)
    except Exception:
        return None


def force_back_to_wait_list(page):
    """处理完一条后，强制回到 sourceType=wait 列表页。"""
    print(c_info("已处理 1 条，强制刷新回待办列表页..."))
    try:
        page.goto(OA_WAIT_LIST_URL, wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:
            pass
    except Exception as exc:
        print(c_warn(f"跳转待办列表失败: {exc}，尝试刷新当前页"))
        try:
            page.reload(wait_until="domcontentloaded")
        except Exception:
            ensure_list_page(page)


def run_loop(page, mode: str, limit: Optional[int]):
    done_count = 0
    fail_count = 0
    idle_count = 0

    print(c_info("开始自动处理..."))
    if mode == "infinite":
        print(c_info("当前模式: 无限模式（Ctrl+C 停止）"))
    else:
        print(c_info(f"当前模式: 有限模式（最多处理 {limit} 条）"))

    while True:
        if mode == "finite" and done_count >= (limit or 0):
            print(c_ok(f"已达到设定次数: {done_count}/{limit}"))
            break

        try:
            result, processed_title = process_one(page)
        except Exception as exc:
            result = "failed"
            processed_title = None
            print(c_warn(f"本轮异常: {exc}"))

        if result == "done":
            done_count += 1
            idle_count = 0
            print(c_ok(f"累计已处理: {done_count}"))
            force_back_to_wait_list(page)
            continue

        if result == "empty":
            idle_count += 1
            if mode == "finite":
                if idle_count >= EMPTY_RETRY_LIMIT_FINITE:
                    print(c_warn("连续多次无可处理待办，有限模式提前结束。"))
                    break
                print(c_warn(f"当前无可处理待办（第 {idle_count}/{EMPTY_RETRY_LIMIT_FINITE} 次），刷新后重试..."))
                time.sleep(1)
                try:
                    page.reload(wait_until="domcontentloaded")
                except Exception:
                    ensure_list_page(page)
                continue
            print(c_warn(f"暂无待办，第 {idle_count} 次轮询空列表，{POLL_INTERVAL_SECONDS}s 后重试..."))
            time.sleep(POLL_INTERVAL_SECONDS)
            try:
                page.reload(wait_until="domcontentloaded")
            except Exception:
                ensure_list_page(page)
            continue

        fail_count += 1
        print(c_warn(f"本轮失败，累计失败: {fail_count}，准备刷新重试..."))
        try:
            page.reload(wait_until="domcontentloaded")
        except Exception:
            ensure_list_page(page)
        time.sleep(1)

    print(c_info("处理结束"))
    print(c_ok(f"成功处理: {done_count}"))
    print(c_warn(f"失败次数: {fail_count}"))


def main():
    print(c_info("自动点OA助手"))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(15000)

        bootstrap_open_oa(page)
        print(c_warn("请在浏览器中完成登录，并确保已进入“我的已办/待办”列表页面。"))
        input(c_info("准备好后按回车继续: "))
        mode, limit = ask_mode()
        input(c_info("按回车开始自动点击: "))

        try:
            run_loop(page, mode, limit)
        except KeyboardInterrupt:
            print(c_warn("\n收到中断信号，正在停止..."))
        finally:
            context.close()
            browser.close()
            print(c_info("已退出。"))


if __name__ == "__main__":
    main()
