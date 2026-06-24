// 生成应用的运行时脚本聚合器

declare const GeneratedAppRuntimeState: {
    generate(fieldsJson: string, loopFieldsJson: string, templateFileName: string): string;
};

declare const GeneratedAppRuntimeTemplate: {
    generate(): string;
};

declare const GeneratedAppRuntimeLoop: {
    generate(): string;
};

declare const GeneratedAppRuntimeDate: {
    generate(): string;
};

declare const GeneratedAppRuntimeForm: {
    generate(): string;
};

declare const GeneratedAppRuntimeBatch: {
    generate(): string;
};

declare const GeneratedAppRuntimeExport: {
    generate(): string;
};

declare const GeneratedAppRuntimeEvents: {
    generate(): string;
};

const GeneratedAppScript = {
    generate: (config, templateFileName) => {
        const fieldsJson = JSON.stringify(config.fields);
        const loopFieldsJson = JSON.stringify(config.loopFields);

        return [
            GeneratedAppRuntimeState.generate(fieldsJson, loopFieldsJson, templateFileName),
            GeneratedAppRuntimeTemplate.generate(),
            GeneratedAppRuntimeLoop.generate(),
            GeneratedAppRuntimeForm.generate(),
            GeneratedAppRuntimeDate.generate(),
            GeneratedAppRuntimeBatch.generate(),
            GeneratedAppRuntimeExport.generate(),
            GeneratedAppRuntimeEvents.generate()
        ].join('\n');
    }
};
