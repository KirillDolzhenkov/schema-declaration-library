// Базовый тип для валидаторов
type Validator<T> = (value: T) => string | null;

// Базовый класс схемы
class PromptSchema<T> {
    protected readonly checks: Validator<T>[] = [];

    constructor(checks: Validator<T>[] = []) {
        this.checks = checks;
    }

    protected addValidator(validator: Validator<T>): this {
        return new (this.constructor as any)([...this.checks, validator]);
    }

    parse(value: T): T {
        const error = this.validate(value);
        if (error) {
            throw new Error(error);
        }
        return value;
    }

    safeParse(value: T): { success: boolean; error?: string } {
        const error = this.validate(value);
        return error ? { success: false, error } : { success: true };
    }

    validate(value: T): string | null {
        for (const check of this.checks) {
            const error = check(value);
            if (error) {
                return error;
            }
        }
        return null;
    }

    validateAll(value: T): string[] {
        const errors: string[] = [];
        for (const check of this.checks) {
            const error = check(value);
            if (error) {
                errors.push(error);
            }
        }
        return errors;
    }

    required(message = "Required"): this {
        return this.addValidator((value) => {
            if (value === null || value === undefined) return message;
            if (typeof value === "string" && value.trim() === "") return message;
            if (Array.isArray(value) && value.length === 0) return message;
            return null;
        });
    }
}

// Подкласс для строк
class StringSchema extends PromptSchema<string> {
    max(length: number, message = `Must be at most ${length} characters`): StringSchema {
        return this.addValidator((value) => (typeof value === "string" && value.length > length ? message : null));
    }

    min(length: number, message = `Must be at least ${length} characters`): StringSchema {
        return this.addValidator((value) => (typeof value === "string" && value.length < length ? message : null));
    }

    regex(pattern: RegExp, message = "Invalid format"): StringSchema {
        return this.addValidator((value) => (typeof value === "string" && !pattern.test(value) ? message : null));
    }

    email(message = "Must be a valid email"): StringSchema {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return this.addValidator((value) => (typeof value === "string" && !emailRegex.test(value) ? message : null));
    }

    url(message = "Must be a valid URL"): StringSchema {
        const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
        return this.addValidator((value) => (typeof value === "string" && !urlRegex.test(value) ? message : null));
    }

    startsWith(prefix: string, message = `Must start with "${prefix}"`): StringSchema {
        return this.addValidator((value) => (typeof value === "string" && !value.startsWith(prefix) ? message : null));
    }

    endsWith(suffix: string, message = `Must end with "${suffix}"`): StringSchema {
        return this.addValidator((value) => (typeof value === "string" && !value.endsWith(suffix) ? message : null));
    }
}

// Подкласс для чисел
class NumberSchema extends PromptSchema<number> {
    min(value: number, message = `Must be at least ${value}`): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && val < value ? message : null));
    }

    max(value: number, message = `Must be at most ${value}`): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && val > value ? message : null));
    }

    integer(message = "Must be an integer"): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && !Number.isInteger(val) ? message : null));
    }

    positive(message = "Must be positive"): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && val <= 0 ? message : null));
    }

    negative(message = "Must be negative"): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && val >= 0 ? message : null));
    }

    nonnegative(message = "Must be non-negative"): NumberSchema {
        return this.addValidator((val) => (typeof val === "number" && val < 0 ? message : null));
    }
}

// Подкласс для булевых значений
class BooleanSchema extends PromptSchema<boolean> {
    true(message = "Must be true"): BooleanSchema {
        return this.addValidator((val) => (val !== true ? message : null));
    }

    false(message = "Must be false"): BooleanSchema {
        return this.addValidator((val) => (val !== false ? message : null));
    }
}

// Фабрика для создания схем
const PromptValidator = {
    string(): StringSchema {
        return new StringSchema();
    },
    number(): NumberSchema {
        return new NumberSchema();
    },
    boolean(): BooleanSchema {
        return new BooleanSchema();
    },
};

export default PromptValidator;