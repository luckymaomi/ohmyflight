(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    function renderCategories(
        container: HTMLElement,
        counts: RevisionCategoryCount[],
        activeKind: RevisionKind | "all",
        hasQuery: boolean
    ): void {
        container.innerHTML = counts.map((item) => {
            const count = hasQuery && item.matched !== item.total ? `${item.matched}/${item.total}` : String(item.total);
            return `<button class="filter-button${item.kind === activeKind ? " active" : ""}" data-filter="${item.kind}" type="button">
                <span>${escapeHtml(item.label)}</span><strong>${escapeHtml(count)}</strong>
            </button>`;
        }).join("");
    }

    function renderOutline(
        chapterNavigation: HTMLElement,
        sectionNavigation: HTMLElement,
        chapterCount: HTMLElement,
        sectionCount: HTMLElement,
        resultCount: HTMLElement,
        outline: RevisionChapterGroup[],
        chapterKey: string,
        sectionKey: string,
        visibleEventCount: number,
        hasComparison: boolean
    ): void {
        if (!outline.length) {
            chapterNavigation.innerHTML = hasComparison
                ? '<div class="outline-empty">当前范围没有章节。</div>'
                : '<div class="outline-empty">完成比对后显示章节。</div>';
            sectionNavigation.innerHTML = '<div class="outline-empty">选择章节后显示小节。</div>';
            chapterCount.textContent = "";
            sectionCount.textContent = "";
            resultCount.textContent = "";
            return;
        }
        chapterNavigation.innerHTML = outline.map((chapter) => `
            <button type="button" class="outline-button${chapter.key === chapterKey ? " active" : ""}"
                data-chapter-key="${escapeHtml(chapter.key)}" aria-expanded="${chapter.key === chapterKey}">
                <span>${escapeHtml(chapter.label)}</span><strong>${chapter.count}</strong>
            </button>
        `).join("");
        const chapter = outline.find((item) => item.key === chapterKey);
        const sections = chapter?.sections || [];
        sectionNavigation.innerHTML = sections.map((section) => `
            <button type="button" class="outline-button section-button${section.key === sectionKey ? " active" : ""}"
                data-section-key="${escapeHtml(section.key)}" aria-expanded="${section.key === sectionKey}">
                <span>${escapeHtml(section.label)}</span><strong>${section.count}</strong>
            </button>
        `).join("");
        chapterCount.textContent = `${outline.length} 章`;
        sectionCount.textContent = `${sections.length} 节`;
        resultCount.textContent = visibleEventCount ? `${visibleEventCount} 项` : "";
    }

    function renderEvents(
        navigation: HTMLElement,
        spacer: HTMLElement,
        visible: HTMLElement,
        events: RevisionNavigationEvent[],
        selectedId: string,
        query: string,
        hasComparison: boolean
    ): void {
        if (!events.length) {
            spacer.style.height = "0";
            visible.innerHTML = hasComparison
                ? '<div class="navigation-empty">当前小节没有修订事件。</div>'
                : '<div class="navigation-empty">完成比对后显示修订事件。</div>';
            return;
        }
        const range = runtime.Navigation.calculateWindow(
            navigation.scrollTop,
            navigation.clientHeight,
            events.length
        ) as VirtualWindow;
        spacer.style.height = `${range.totalHeight}px`;
        visible.style.transform = `translateY(${range.offsetTop}px)`;
        visible.innerHTML = events.slice(range.start, range.end).map((event) => `
            <button type="button" class="event-row event-${event.kind}${event.id === selectedId ? " active" : ""}" data-event-id="${escapeHtml(event.id)}">
                <span class="event-kind">${escapeHtml(runtime.Navigation.label(event.kind))}</span>
                <strong>${escapeHtml(event.title)}</strong>
                <span class="event-location">${escapeHtml(matchedSideLabel(event, query))} · ${escapeHtml(matchedLocation(event))}</span>
                <span class="event-excerpt">${highlightQuery(event.matchedExcerpt || event.referenceText || event.myText, query)}</span>
            </button>
        `).join("");
    }

    function matchedSideLabel(event: RevisionNavigationEvent, query: string): string {
        if (!query) {
            if (event.myText && event.referenceText) return "双侧原文";
            return event.referenceText ? "参考手册" : "我的手册";
        }
        return { title: "标题命中", my: "我的手册命中", reference: "参考手册命中", both: "双侧命中" }[event.matchedSide || "title"];
    }

    function matchedLocation(event: RevisionNavigationEvent): string {
        if (event.matchedSide === "my") return event.myLocation;
        if (event.matchedSide === "reference") return event.referenceLocation;
        if (event.matchedSide === "both") return `${event.myLocation} / ${event.referenceLocation}`;
        return event.referenceLocation !== "无对应原文" ? event.referenceLocation : event.myLocation;
    }

    function highlightQuery(value: string, query: string): string {
        const source = String(value || "");
        if (!query) return escapeHtml(source);
        const index = source.normalize("NFKC").toLowerCase().indexOf(query.normalize("NFKC").toLowerCase());
        if (index < 0) return escapeHtml(source);
        return `${escapeHtml(source.slice(0, index))}<mark>${escapeHtml(source.slice(index, index + query.length))}</mark>${escapeHtml(source.slice(index + query.length))}`;
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    runtime.RevisionNavigationView = { renderCategories, renderOutline, renderEvents };
})();
