type Validator<T> = (value: T) => null | string;

// Интерфейс для результата валидации объекта
interface ObjectValidationResult {
    errors?: Record<string, string>;
    success: boolean;
}

// Интерфейс для результата валидации массива
interface ArrayValidationResult {
    errors?: Record<string, string>;
    success: boolean;
}

// Базовый класс схемы
class PromptSchema<T> {
    protected readonly checks: Validator<T>[] = [];
    protected isOptional: boolean = false;

    constructor(checks: Validator<T>[] = []) {
        this.checks = checks;
    }

    protected addValidator(validator: Validator<T>): this {
        return new (this.constructor as any)([...this.checks, validator]);
    }

    optional(): this {
        const instance = new (this.constructor as any)(this.checks);
        instance.isOptional = true;
        return instance;
    }

    parse(value: T): T {
        const error = this.validate(value);
        if (error) {
            throw new Error(error);
        }
        return value;
    }

    refine(validator: (value: T) => boolean, message = 'Custom validation failed'): this {
        return this.addValidator((value) => (validator(value) ? null : message));
    }

    required(message = 'Required'): this {
        return this.addValidator((value) => {
            if (value === null || value === undefined) return message;
            if (typeof value === 'string' && value.trim() === '') return message;
            if (Array.isArray(value) && value.length === 0) return message;
            return null;
        });
    }

    safeParse(value: T): { error?: string; success: boolean } {
        const error = this.validate(value);
        return error ? { success: false, error } : { success: true };
    }

    validate(value: T): null | string {
        if ((value === undefined || value === null) && this.isOptional) {
            return null;
        }
        for (const check of this.checks) {
            const error = check(value);
            if (error) return error;
        }
        return null;
    }

    validateAll(value: T): string[] {
        if ((value === undefined || value === null) && this.isOptional) {
            return [];
        }
        const errors: string[] = [];
        for (const check of this.checks) {
            const error = check(value);
            if (error) errors.push(error);
        }
        return errors;
    }
}

// Подкласс для булевых значений
class BooleanSchema extends PromptSchema<boolean> {
    false(message = 'Must be false'): BooleanSchema {
        return this.addValidator((value) => (value !== false ? message : null));
    }

    true(message = 'Must be true'): BooleanSchema {
        return this.addValidator((value) => (value !== true ? message : null));
    }
}

// Подкласс для чисел
class NumberSchema extends PromptSchema<number> {
    integer(message = 'Must be an integer'): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && !Number.isInteger(value) ? message : null));
    }

    max(value: number, message = `Must be at most ${value}`): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && value > value ? message : null));
    }

    min(value: number, message = `Must be at least ${value}`): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && value < value ? message : null));
    }

    negative(message = 'Must be negative'): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && value >= 0 ? message : null));
    }

    nonnegative(message = 'Must be non-negative'): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && value < 0 ? message : null));
    }

    positive(message = 'Must be positive'): NumberSchema {
        return this.addValidator((value) => (typeof value === 'number' && value <= 0 ? message : null));
    }
}

// Подкласс для строк
class StringSchema extends PromptSchema<string> {
    email(message = 'Must be a valid email'): StringSchema {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return this.addValidator((value) => (typeof value === 'string' && !emailRegex.test(value) ? message : null));
    }

    endsWith(suffix: string, message = `Must end with "${suffix}"`): StringSchema {
        return this.addValidator((value) => (typeof value === 'string' && !value.endsWith(suffix) ? message : null));
    }

    max(length: number, message = `Must be at most ${length} characters`): StringSchema {
        return this.addValidator((value) => (typeof value === 'string' && value.length > length ? message : null));
    }

    min(length: number, message = `Must be at least ${length} characters`): StringSchema {
        return this.addValidator((value) => (typeof value === 'string' && value.length < length ? message : null));
    }

    regex(pattern: RegExp, message = 'Invalid format'): StringSchema {
        return this.addValidator((value) => (typeof value === 'string' && !pattern.test(value) ? message : null));
    }

    startsWith(prefix: string, message = `Must start with "${prefix}"`): StringSchema {
        return this.addValidator((value) => (typeof value === 'string' && !value.startsWith(prefix) ? message : null));
    }

    url(message = 'Must be a valid URL'): StringSchema {
        const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
        return this.addValidator((value) => (typeof value === 'string' && !urlRegex.test(value) ? message : null));
    }
}

// Подкласс для объектов
class ObjectSchema<T extends Record<string, any>> extends PromptSchema<T> {
    constructor(private readonly shape: { [K in keyof T]: PromptSchema<T[K]> }) {
        super();
    }

    parse(value: T): T {
        const result = this.safeParse(value);
        if (!result.success) {
            throw new Error(JSON.stringify(result.errors));
        }
        return value;
    }

    safeParse(value: any): ObjectValidationResult {
        if (value === null || value === undefined || typeof value !== 'object') {
            return { success: false, errors: { root: 'Must be an object' } };
        }

        const errors: Record<string, string> = {};
        let success = true;

        for (const key in this.shape) {
            if (Object.hasOwn(this.shape, key)) {
                const schema = this.shape[key];
                const fieldValue = value[key];
                const error = schema.validate(fieldValue);
                if (error) {
                    errors[key] = error;
                    success = false;
                }
            }
        }

        return success ? { success: true } : { success: false, errors };
    }

    validate(value: T): null | string {
        const result = this.safeParse(value);
        return result.success ? null : JSON.stringify(result.errors);
    }

    validateAll(value: T): string[] {
        const result = this.safeParse(value);
        return result.success ? [] : Object.entries(result.errors || {}).map(([key, error]) => `${key}: ${error}`);
    }
}

// Подкласс для массивов
class ArraySchema<T> extends PromptSchema<T[]> {
    constructor(private readonly itemSchema: PromptSchema<T>) {
        super();
    }

    max(length: number, message = `Must have at most ${length} items`): ArraySchema<T> {
        return this.addValidator((value) => (Array.isArray(value) && value.length > length ? message : null));
    }

    min(length: number, message = `Must have at least ${length} items`): ArraySchema<T> {
        return this.addValidator((value) => (Array.isArray(value) && value.length < length ? message : null));
    }

    parse(value: T[]): T[] {
        const result = this.safeParse(value);
        if (!result.success) {
            throw new Error(JSON.stringify(result.errors));
        }
        return value;
    }

    safeParse(value: any): ArrayValidationResult {
        if (!Array.isArray(value)) {
            return { success: false, errors: { root: 'Must be an array' } };
        }

        const errors: Record<string, string> = {};
        let success = true;

        value.forEach((item, index) => {
            const error = this.itemSchema.validate(item);
            if (error) {
                errors[index.toString()] = error;
                success = false;
            }
        });

        const arrayErrors = this.validate(value);
        if (arrayErrors) {
            errors.root = arrayErrors;
            success = false;
        }

        return success ? { success: true } : { success: false, errors };
    }

    unique(comparator?: (a: T, b: T) => boolean, message = 'Array must contain unique items'): ArraySchema<T> {
        return this.addValidator((value) => {
            if (!Array.isArray(value)) return null;
            for (let i = 0; i < value.length; i++) {
                for (let j = i + 1; j < value.length; j++) {
                    const isDuplicate = comparator ? comparator(value[i], value[j]) : value[i] === value[j];
                    if (isDuplicate) return message;
                }
            }
            return null;
        });
    }

    validate(value: T[]): null | string {
        const result = this.safeParse(value);
        return result.success ? null : JSON.stringify(result.errors);
    }

    validateAll(value: T[]): string[] {
        const result = this.safeParse(value);
        return result.success ? [] : Object.entries(result.errors || {}).map(([key, error]) => `${key}: ${error}`);
    }
}

// Фабрика для создания схем
const PromptValidator = {
    array<T>(itemSchema: PromptSchema<T>): ArraySchema<T> {
        return new ArraySchema<T>(itemSchema);
    },
    boolean(): BooleanSchema {
        return new BooleanSchema();
    },
    number(): NumberSchema {
        return new NumberSchema();
    },
    object<T extends Record<string, any>>(shape: { [K in keyof T]: PromptSchema<T[K]> }): ObjectSchema<T> {
        return new ObjectSchema<T>(shape);
    },
    string(): StringSchema {
        return new StringSchema();
    },
};

export default PromptValidator;