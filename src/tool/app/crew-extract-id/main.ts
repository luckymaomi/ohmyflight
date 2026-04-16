document.addEventListener('DOMContentLoaded', function() {
    function requireElement<T extends HTMLElement>(id: string, Type: { new(): T }): T {
        const element = document.getElementById(id);
        if (!(element instanceof Type)) {
            throw new Error(`页面缺少必要元素：${id}`);
        }
        return element;
    }

    const inputText = requireElement('inputText', HTMLTextAreaElement);
    const outputArea = requireElement('outputArea', HTMLElement);
    const extractBtn = requireElement('extractBtn', HTMLButtonElement);
    const clearBtn = requireElement('clearBtn', HTMLButtonElement);
    const copyBtn = requireElement('copyBtn', HTMLButtonElement);
    const countInfo = requireElement('countInfo', HTMLElement);
    const uniqueInfo = requireElement('uniqueInfo', HTMLElement);
    
    function extractSixDigitNumbers(text: string): string[] {
        const regex = /\d{6}/g;
        const matches = text.match(regex);
        return matches || [];
    }
    
    function formatNumbers(numbers: string[]): string {
        const uniqueNumbers = [...new Set(numbers)];
        uniqueNumbers.sort((a, b) => Number(a) - Number(b));
        return uniqueNumbers.join('\n');
    }
    
    function getCurrentNumbers(): string[] {
        const text = inputText.value;
        const numbers = extractSixDigitNumbers(text);
        const uniqueNumbers = [...new Set(numbers)];
        uniqueNumbers.sort((a, b) => Number(a) - Number(b));
        return uniqueNumbers;
    }
    
    function updateStats(numbers: string[]): void {
        const uniqueNumbers = [...new Set(numbers)];
        countInfo.textContent = `提取到 ${numbers.length} 个六位数字`;
        uniqueInfo.textContent = `去重后 ${uniqueNumbers.length} 个唯一数字`;
    }

    extractBtn.addEventListener('click', function() {
        const text = inputText.value;
        const numbers = extractSixDigitNumbers(text);
        
        if (numbers.length === 0) {
            outputArea.textContent = "未找到六位数字，请检查输入文本。";
            countInfo.textContent = "提取到 0 个六位数字";
            uniqueInfo.textContent = "去重后 0 个唯一数字";
            return;
        }
        
        outputArea.textContent = formatNumbers(numbers);
        updateStats(numbers);
    });
    
    clearBtn.addEventListener('click', function() {
        inputText.value = '';
        outputArea.textContent = '提取结果将显示在这里...';
        countInfo.textContent = '提取到 0 个六位数字';
        uniqueInfo.textContent = '去重后 0 个唯一数字';
        inputText.focus();
    });
    
    copyBtn.addEventListener('click', function() {
        const numbers = getCurrentNumbers();
        if (numbers.length === 0) {
            alert('没有可复制的数字，请先提取数字。');
            return;
        }
        
        navigator.clipboard.writeText(numbers.join('\n'))
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '已复制！';
                copyBtn.style.backgroundColor = '#1a7f37';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            })
            .catch(() => {
                alert('复制失败，请手动选择文本复制。');
            });
    });
});
