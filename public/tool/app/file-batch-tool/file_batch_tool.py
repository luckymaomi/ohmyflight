#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件批量处理工具
支持：添加前缀/后缀、删除字符、创建同名文件夹
"""

import os
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path
from datetime import datetime
import threading


class FileBatchTool:
    def __init__(self, root):
        self.root = root
        self.root.title("文件批量处理工具")
        self.root.geometry("900x700")
        
        self.files = []  # 存储文件路径
        self.target_folder = ""
        self.history_file = "file_operation_history.json"
        
        self.setup_ui()
        
    def setup_ui(self):
        # 顶部：文件夹选择
        top_frame = ttk.Frame(self.root, padding="10")
        top_frame.pack(fill=tk.X)
        
        ttk.Label(top_frame, text="目标文件夹:").pack(side=tk.LEFT)
        self.folder_var = tk.StringVar()
        ttk.Entry(top_frame, textvariable=self.folder_var, width=50).pack(side=tk.LEFT, padx=5)
        ttk.Button(top_frame, text="浏览", command=self.browse_folder).pack(side=tk.LEFT)
        ttk.Button(top_frame, text="扫描", command=self.scan_files).pack(side=tk.LEFT, padx=5)
        
        # 文件信息
        info_frame = ttk.Frame(self.root, padding="10")
        info_frame.pack(fill=tk.X)
        self.info_label = ttk.Label(info_frame, text="文件数量: 0 个")
        self.info_label.pack(side=tk.LEFT)
        
        # 操作选项
        option_frame = ttk.LabelFrame(self.root, text="操作选项", padding="10")
        option_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.operation_var = tk.StringVar(value="prefix")
        
        # 添加前缀
        prefix_frame = ttk.Frame(option_frame)
        prefix_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(prefix_frame, text="添加前缀", variable=self.operation_var, 
                       value="prefix").pack(side=tk.LEFT)
        self.prefix_var = tk.StringVar()
        ttk.Entry(prefix_frame, textvariable=self.prefix_var, width=30).pack(side=tk.LEFT, padx=5)
        
        # 添加后缀
        suffix_frame = ttk.Frame(option_frame)
        suffix_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(suffix_frame, text="添加后缀", variable=self.operation_var, 
                       value="suffix").pack(side=tk.LEFT)
        self.suffix_var = tk.StringVar()
        ttk.Entry(suffix_frame, textvariable=self.suffix_var, width=30).pack(side=tk.LEFT, padx=5)
        
        # 删除字符
        delete_frame = ttk.Frame(option_frame)
        delete_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(delete_frame, text="删除字符", variable=self.operation_var, 
                       value="delete").pack(side=tk.LEFT)
        self.delete_var = tk.StringVar()
        ttk.Entry(delete_frame, textvariable=self.delete_var, width=30).pack(side=tk.LEFT, padx=5)
        
        # 替换字符
        replace_frame = ttk.Frame(option_frame)
        replace_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(replace_frame, text="替换字符", variable=self.operation_var, 
                       value="replace").pack(side=tk.LEFT)
        self.replace_old_var = tk.StringVar()
        self.replace_new_var = tk.StringVar()
        ttk.Entry(replace_frame, textvariable=self.replace_old_var, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Label(replace_frame, text="→").pack(side=tk.LEFT)
        ttk.Entry(replace_frame, textvariable=self.replace_new_var, width=15).pack(side=tk.LEFT, padx=5)
        
        # 修改扩展名
        ext_frame = ttk.Frame(option_frame)
        ext_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(ext_frame, text="修改扩展名", variable=self.operation_var, 
                       value="extension").pack(side=tk.LEFT)
        self.old_ext_var = tk.StringVar()
        self.new_ext_var = tk.StringVar()
        ttk.Entry(ext_frame, textvariable=self.old_ext_var, width=10).pack(side=tk.LEFT, padx=5)
        ttk.Label(ext_frame, text="→").pack(side=tk.LEFT)
        ttk.Entry(ext_frame, textvariable=self.new_ext_var, width=10).pack(side=tk.LEFT, padx=5)
        ttk.Label(ext_frame, text="(如: .png → .jpg)", foreground="gray").pack(side=tk.LEFT, padx=5)
        
        # 创建文件夹选项
        self.create_folder_var = tk.BooleanVar()
        ttk.Checkbutton(option_frame, text="创建同名文件夹并移动文件", 
                       variable=self.create_folder_var).pack(anchor=tk.W, pady=5)
        
        # 递归子文件夹选项
        self.recursive_var = tk.BooleanVar()
        ttk.Checkbutton(option_frame, text="包含子文件夹（扫描时递归遍历所有子文件夹）", 
                       variable=self.recursive_var).pack(anchor=tk.W)
        
        # 创建Notebook用于多个标签页
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 文件列表标签页
        file_list_frame = ttk.Frame(notebook)
        notebook.add(file_list_frame, text="文件列表")
        
        self.file_list_text = scrolledtext.ScrolledText(file_list_frame, height=15, width=80)
        self.file_list_text.pack(fill=tk.BOTH, expand=True)
        
        # 预览标签页
        preview_frame = ttk.Frame(notebook)
        notebook.add(preview_frame, text="预览结果")
        
        self.preview_text = scrolledtext.ScrolledText(preview_frame, height=15, width=80)
        self.preview_text.pack(fill=tk.BOTH, expand=True)
        
        # 按钮区域
        button_frame = ttk.Frame(self.root, padding="10")
        button_frame.pack(fill=tk.X)
        
        ttk.Button(button_frame, text="预览", command=self.preview_operation).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="执行操作", command=self.execute_operation).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="撤销上次操作", command=self.undo_operation).pack(side=tk.LEFT, padx=5)
        
        # 进度条
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(self.root, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(fill=tk.X, padx=10, pady=5)
        
        self.status_label = ttk.Label(self.root, text="就绪")
        self.status_label.pack(pady=5)
        
    def browse_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.folder_var.set(folder)
            self.target_folder = folder
            
    def scan_files(self):
        if not self.target_folder:
            messagebox.showwarning("警告", "请先选择文件夹")
            return
            
        self.files = []
        self.file_list_text.delete(1.0, tk.END)
        self.preview_text.delete(1.0, tk.END)
        
        try:
            if self.recursive_var.get():
                # 递归扫描
                for root, dirs, files in os.walk(self.target_folder):
                    for file in files:
                        self.files.append(os.path.join(root, file))
            else:
                # 只扫描当前文件夹
                for item in os.listdir(self.target_folder):
                    full_path = os.path.join(self.target_folder, item)
                    if os.path.isfile(full_path):
                        self.files.append(full_path)
            
            # 显示所有文件
            for i, file_path in enumerate(self.files, 1):
                filename = os.path.basename(file_path)
                self.file_list_text.insert(tk.END, f"{i}. {filename}\n")
            
            self.info_label.config(text=f"文件数量: {len(self.files)} 个")
            self.status_label.config(text=f"扫描完成，找到 {len(self.files)} 个文件")
            
        except Exception as e:
            messagebox.showerror("错误", f"扫描文件失败: {str(e)}")
            
    def get_new_name(self, old_path):
        """根据操作类型生成新文件名"""
        directory = os.path.dirname(old_path)
        filename = os.path.basename(old_path)
        name, ext = os.path.splitext(filename)
        
        operation = self.operation_var.get()
        
        if operation == "prefix":
            prefix = self.prefix_var.get()
            if prefix:  # 只有输入了前缀才修改
                new_name = prefix + name + ext
            else:
                new_name = filename
        elif operation == "suffix":
            suffix = self.suffix_var.get()
            if suffix:  # 只有输入了后缀才修改
                new_name = name + suffix + ext
            else:
                new_name = filename
        elif operation == "delete":
            delete_str = self.delete_var.get()
            if delete_str:  # 只有输入了要删除的字符才修改
                new_name = name.replace(delete_str, "") + ext
            else:
                new_name = filename
        elif operation == "replace":
            old_str = self.replace_old_var.get()
            new_str = self.replace_new_var.get()
            if old_str:  # 只有输入了要替换的字符才修改
                new_name = name.replace(old_str, new_str) + ext
            else:
                new_name = filename
        elif operation == "extension":
            # 修改扩展名
            old_ext = self.old_ext_var.get()
            new_ext = self.new_ext_var.get()
            
            if old_ext and new_ext:  # 两个都输入了才修改
                # 确保扩展名以.开头
                if not old_ext.startswith('.'):
                    old_ext = '.' + old_ext
                if not new_ext.startswith('.'):
                    new_ext = '.' + new_ext
                
                # 只修改匹配的扩展名
                if ext.lower() == old_ext.lower():
                    new_name = name + new_ext
                else:
                    new_name = filename  # 不匹配则保持原样
            else:
                new_name = filename
        else:
            new_name = filename
            
        return os.path.join(directory, new_name)
        
    def preview_operation(self):
        if not self.files:
            messagebox.showwarning("警告", "请先扫描文件")
            return
            
        self.preview_text.delete(1.0, tk.END)
        
        # 显示所有文件的预览
        for i, old_path in enumerate(self.files, 1):
            new_path = self.get_new_name(old_path)
            
            old_name = os.path.basename(old_path)
            new_name = os.path.basename(new_path)
            
            if self.create_folder_var.get():
                folder_name = os.path.splitext(new_name)[0]
                self.preview_text.insert(tk.END, f"{i}. {old_name} → {folder_name}/{new_name}\n")
            else:
                self.preview_text.insert(tk.END, f"{i}. {old_name} → {new_name}\n")
            
        self.status_label.config(text=f"预览完成，共 {len(self.files)} 个文件")
        
    def execute_operation(self):
        if not self.files:
            messagebox.showwarning("警告", "请先扫描文件")
            return
            
        if not messagebox.askyesno("确认", f"确定要处理 {len(self.files)} 个文件吗？"):
            return
            
        # 在新线程中执行，避免界面卡顿
        thread = threading.Thread(target=self._execute_operation_thread)
        thread.start()
        
    def _execute_operation_thread(self):
        operations = []  # 记录操作，用于撤销
        success_count = 0
        error_count = 0
        
        try:
            for i, old_path in enumerate(self.files):
                try:
                    new_path = self.get_new_name(old_path)
                    
                    if self.create_folder_var.get():
                        # 创建同名文件夹
                        new_name = os.path.basename(new_path)
                        folder_name = os.path.splitext(new_name)[0]
                        folder_path = os.path.join(os.path.dirname(new_path), folder_name)
                        
                        os.makedirs(folder_path, exist_ok=True)
                        final_path = os.path.join(folder_path, new_name)
                    else:
                        final_path = new_path
                    
                    # 执行重命名/移动
                    if old_path != final_path:
                        os.rename(old_path, final_path)
                        operations.append({"old": old_path, "new": final_path})
                        success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    print(f"处理失败 {old_path}: {str(e)}")
                
                # 更新进度
                progress = (i + 1) / len(self.files) * 100
                self.progress_var.set(progress)
                self.status_label.config(text=f"处理中: {i+1}/{len(self.files)}")
                
            # 保存操作历史
            self.save_history(operations)
            
            self.status_label.config(text=f"完成！成功: {success_count}, 失败: {error_count}")
            messagebox.showinfo("完成", f"操作完成！\n成功: {success_count}\n失败: {error_count}")
            
            # 重新扫描
            self.scan_files()
            
        except Exception as e:
            messagebox.showerror("错误", f"执行失败: {str(e)}")
            
    def save_history(self, operations):
        """保存操作历史"""
        history = {
            "timestamp": datetime.now().isoformat(),
            "operations": operations
        }
        
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存历史失败: {str(e)}")
            
    def undo_operation(self):
        """撤销上次操作"""
        if not os.path.exists(self.history_file):
            messagebox.showinfo("提示", "没有可撤销的操作")
            return
            
        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
                
            operations = history.get("operations", [])
            
            if not operations:
                messagebox.showinfo("提示", "没有可撤销的操作")
                return
                
            if not messagebox.askyesno("确认", f"确定要撤销 {len(operations)} 个文件的操作吗？"):
                return
                
            success_count = 0
            error_count = 0
            
            # 反向执行操作
            for op in reversed(operations):
                try:
                    if os.path.exists(op["new"]):
                        os.rename(op["new"], op["old"])
                        success_count += 1
                except Exception as e:
                    error_count += 1
                    print(f"撤销失败: {str(e)}")
                    
            messagebox.showinfo("完成", f"撤销完成！\n成功: {success_count}\n失败: {error_count}")
            
            # 删除历史文件
            os.remove(self.history_file)
            
            # 重新扫描
            self.scan_files()
            
        except Exception as e:
            messagebox.showerror("错误", f"撤销失败: {str(e)}")


def main():
    root = tk.Tk()
    app = FileBatchTool(root)
    root.mainloop()


if __name__ == "__main__":
    main()
