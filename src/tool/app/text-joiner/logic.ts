type TextJoinerResult = {
    items: string[];
    text: string;
};

type TextJoinerLogicApi = {
    splitItems: (input: string) => string[];
    join: (input: string, separator?: string) => TextJoinerResult;
};

const TEXT_JOINER_INPUT_SEPARATOR = /[\s\p{P}\p{S}]+/gu;

function splitTextJoinerItems(input: string): string[] {
    return input
        .split(TEXT_JOINER_INPUT_SEPARATOR)
        .filter((item) => item.length > 0);
}

function joinTextItems(input: string, separator = ""): TextJoinerResult {
    const items = splitTextJoinerItems(input);
    return {
        items,
        text: items.join(separator)
    };
}

const TextJoinerLogic: TextJoinerLogicApi = {
    splitItems: splitTextJoinerItems,
    join: joinTextItems
};

const textJoinerRuntime = globalThis as typeof globalThis & {
    TextJoinerLogic?: TextJoinerLogicApi;
};

textJoinerRuntime.TextJoinerLogic = TextJoinerLogic;
