/**
 * ValidationManager - Centralized form validation and data validation utility
 * Consolidates validation patterns across modules
 */

class ValidationManager {
    constructor() {
        this.validators = new Map();
        this.errorMessages = new Map();
        this.setupDefaultValidators();
        this.setupDefaultErrorMessages();
    }

    /**
     * Setup default validation functions
     * @private
     */
    setupDefaultValidators() {
        // Email validation
        this.validators.set('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });

        // Phone validation (Indian format)
        this.validators.set('phone', (value) => {
            const phoneRegex = /^[6-9]\d{9}$/;
            return phoneRegex.test(value.replace(/\D/g, ''));
        });

        // Required field validation
        this.validators.set('required', (value) => {
            return value !== null && value !== undefined && String(value).trim() !== '';
        });

        // Minimum length validation
        this.validators.set('minLength', (value, minLength) => {
            return String(value).length >= minLength;
        });

        // Maximum length validation
        this.validators.set('maxLength', (value, maxLength) => {
            return String(value).length <= maxLength;
        });

        // Number validation
        this.validators.set('number', (value) => {
            return !isNaN(parseFloat(value)) && isFinite(value);
        });

        // Positive number validation
        this.validators.set('positiveNumber', (value) => {
            const num = parseFloat(value);
            return !isNaN(num) && isFinite(num) && num > 0;
        });

        // Date validation
        this.validators.set('date', (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
        });

        // Age validation (18-100)
        this.validators.set('age', (value) => {
            const age = parseInt(value);
            return age >= 18 && age <= 100;
        });

        // Password strength validation
        this.validators.set('password', (value) => {
            // At least 8 characters, one uppercase, one lowercase, one number
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
            return passwordRegex.test(value);
        });

        // Gym name validation
        this.validators.set('gymName', (value) => {
            return String(value).trim().length >= 3 && String(value).trim().length <= 100;
        });

        // Member name validation
        this.validators.set('memberName', (value) => {
            const nameRegex = /^[a-zA-Z\s]{2,50}$/;
            return nameRegex.test(String(value).trim());
        });

        // Amount validation (for payments)
        this.validators.set('amount', (value) => {
            const amount = parseFloat(value);
            return !isNaN(amount) && isFinite(amount) && amount > 0 && amount <= 100000;
        });

        // Membership plan duration validation
        this.validators.set('duration', (value) => {
            const duration = parseInt(value);
            return duration >= 1 && duration <= 36; // 1 month to 3 years
        });
    }

    /**
     * Setup default error messages
     * @private
     */
    setupDefaultErrorMessages() {
        this.errorMessages.set('email', 'Please enter a valid email address');
        this.errorMessages.set('phone', 'Please enter a valid 10-digit phone number');
        this.errorMessages.set('required', 'This field is required');
        this.errorMessages.set('minLength', 'Must be at least {min} characters long');
        this.errorMessages.set('maxLength', 'Must be no more than {max} characters long');
        this.errorMessages.set('number', 'Please enter a valid number');
        this.errorMessages.set('positiveNumber', 'Please enter a positive number');
        this.errorMessages.set('date', 'Please enter a valid date');
        this.errorMessages.set('age', 'Age must be between 18 and 100');
        this.errorMessages.set('password', 'Password must be at least 8 characters with uppercase, lowercase, and number');
        this.errorMessages.set('gymName', 'Gym name must be between 3 and 100 characters');
        this.errorMessages.set('memberName', 'Name must contain only letters and spaces (2-50 characters)');
        this.errorMessages.set('amount', 'Amount must be between ₹1 and ₹100,000');
        this.errorMessages.set('duration', 'Duration must be between 1 and 36 months');
    }

    /**
     * Validate a single field
     * @param {*} value - Value to validate
     * @param {Array|string} rules - Validation rules
     * @param {string} fieldName - Field name for error messages
     * @returns {Object} Validation result
     */
    validateField(value, rules, fieldName = 'Field') {
        if (typeof rules === 'string') {
            rules = [rules];
        }

        const errors = [];
        
        for (const rule of rules) {
            let ruleName = rule;
            let ruleParams = [];

            // Handle parameterized rules like 'minLength:5'
            if (rule.includes(':')) {
                const parts = rule.split(':');
                ruleName = parts[0];
                ruleParams = parts[1].split(',');
            }

            const validator = this.validators.get(ruleName);
            if (!validator) {
                console.warn(`Unknown validation rule: ${ruleName}`);
                continue;
            }

            const isValid = validator(value, ...ruleParams);
            if (!isValid) {
                let errorMessage = this.errorMessages.get(ruleName) || `${fieldName} is invalid`;
                
                // Replace placeholders in error message
                if (ruleParams.length > 0) {
                    errorMessage = errorMessage.replace('{min}', ruleParams[0]);
                    errorMessage = errorMessage.replace('{max}', ruleParams[0]);
                }
                
                errors.push({
                    rule: ruleName,
                    message: errorMessage,
                    field: fieldName
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            value: value
        };
    }

    /**
     * Validate an entire form object
     * @param {Object} formData - Form data to validate
     * @param {Object} validationRules - Validation rules for each field
     * @returns {Object} Validation result
     */
    validateForm(formData, validationRules) {
        const results = {};
        const allErrors = [];
        let isValid = true;

        for (const [fieldName, rules] of Object.entries(validationRules)) {
            const fieldValue = formData[fieldName];
            const fieldResult = this.validateField(fieldValue, rules, fieldName);
            
            results[fieldName] = fieldResult;
            
            if (!fieldResult.isValid) {
                isValid = false;
                allErrors.push(...fieldResult.errors);
            }
        }

        return {
            isValid,
            errors: allErrors,
            fieldResults: results,
            formData
        };
    }

    /**
     * Validate membership form data
     * @param {Object} memberData - Member data to validate
     * @returns {Object} Validation result
     */
    validateMembershipForm(memberData) {
        const rules = {
            name: ['required', 'memberName'],
            email: ['required', 'email'],
            phone: ['required', 'phone'],
            age: ['required', 'age'],
            membershipPlan: ['required'],
            duration: ['required', 'duration']
        };

        if (memberData.amount) {
            rules.amount = ['required', 'amount'];
        }

        return this.validateForm(memberData, rules);
    }

    /**
     * Validate gym registration form
     * @param {Object} gymData - Gym data to validate
     * @returns {Object} Validation result
     */
    validateGymForm(gymData) {
        const rules = {
            gymName: ['required', 'gymName'],
            ownerName: ['required', 'memberName'],
            email: ['required', 'email'],
            phone: ['required', 'phone'],
            address: ['required', 'minLength:10'],
            city: ['required', 'minLength:2'],
            state: ['required', 'minLength:2']
        };

        return this.validateForm(gymData, rules);
    }

    /**
     * Validate payment form
     * @param {Object} paymentData - Payment data to validate
     * @returns {Object} Validation result
     */
    validatePaymentForm(paymentData) {
        const rules = {
            amount: ['required', 'amount'],
            paymentMethod: ['required'],
            description: ['required', 'minLength:3']
        };

        if (paymentData.memberId) {
            rules.memberId = ['required'];
        }

        return this.validateForm(paymentData, rules);
    }

    /**
     * Validate equipment form
     * @param {Object} equipmentData - Equipment data to validate
     * @returns {Object} Validation result
     */
    validateEquipmentForm(equipmentData) {
        const rules = {
            name: ['required', 'minLength:2', 'maxLength:100'],
            category: ['required'],
            condition: ['required'],
            purchaseDate: ['date']
        };

        if (equipmentData.cost) {
            rules.cost = ['positiveNumber'];
        }

        if (equipmentData.warranty) {
            rules.warranty = ['positiveNumber'];
        }

        return this.validateForm(equipmentData, rules);
    }

    /**
     * Add custom validator
     * @param {string} name - Validator name
     * @param {Function} validator - Validator function
     * @param {string} errorMessage - Default error message
     */
    addValidator(name, validator, errorMessage) {
        this.validators.set(name, validator);
        if (errorMessage) {
            this.errorMessages.set(name, errorMessage);
        }
    }

    /**
     * Display validation errors using ErrorManager
     * @param {Array} errors - Array of validation errors
     * @param {Object} options - Display options
     */
    displayErrors(errors, options = {}) {
        if (!errors || errors.length === 0) return;

        const {
            showFirstOnly = false,
            groupByField = false
        } = options;

        if (window.ErrorManager) {
            if (showFirstOnly) {
                window.ErrorManager.showError(errors[0].message);
            } else if (groupByField) {
                const groupedErrors = this.groupErrorsByField(errors);
                for (const [field, fieldErrors] of Object.entries(groupedErrors)) {
                    const message = `${field}: ${fieldErrors.map(e => e.message).join(', ')}`;
                    window.ErrorManager.showError(message);
                }
            } else {
                const message = errors.map(e => e.message).join('; ');
                window.ErrorManager.showError(message);
            }
        } else {
            // Fallback to console
            console.error('Validation errors:', errors);
        }
    }

    /**
     * Group errors by field name
     * @private
     */
    groupErrorsByField(errors) {
        const grouped = {};
        for (const error of errors) {
            if (!grouped[error.field]) {
                grouped[error.field] = [];
            }
            grouped[error.field].push(error);
        }
        return grouped;
    }

    /**
     * Highlight invalid fields in the DOM
     * @param {Object} fieldResults - Field validation results
     * @param {Object} options - Highlighting options
     */
    highlightInvalidFields(fieldResults, options = {}) {
        const {
            errorClass = 'validation-error',
            successClass = 'validation-success',
            clearPrevious = true
        } = options;

        for (const [fieldName, result] of Object.entries(fieldResults)) {
            const field = document.querySelector(`[name="${fieldName}"]`) || 
                         document.getElementById(fieldName);
            
            if (!field) continue;

            if (clearPrevious) {
                field.classList.remove(errorClass, successClass);
            }

            if (result.isValid) {
                field.classList.add(successClass);
            } else {
                field.classList.add(errorClass);
            }
        }
    }

    /**
     * Clear all field highlighting
     * @param {Array} fieldNames - Field names to clear
     * @param {Object} options - Clear options
     */
    clearHighlighting(fieldNames = [], options = {}) {
        const {
            errorClass = 'validation-error',
            successClass = 'validation-success'
        } = options;

        const selectors = fieldNames.length > 0 
            ? fieldNames.map(name => `[name="${name}"], #${name}`).join(', ')
            : `.${errorClass}, .${successClass}`;

        const fields = document.querySelectorAll(selectors);
        fields.forEach(field => {
            field.classList.remove(errorClass, successClass);
        });
    }

    /**
     * Real-time validation setup for forms
     * @param {HTMLFormElement} form - Form element
     * @param {Object} validationRules - Validation rules
     * @param {Object} options - Setup options
     */
    setupRealTimeValidation(form, validationRules, options = {}) {
        const {
            validateOnBlur = true,
            validateOnInput = false,
            debounceMs = 300
        } = options;

        for (const fieldName of Object.keys(validationRules)) {
            const field = form.querySelector(`[name="${fieldName}"]`) || 
                         form.querySelector(`#${fieldName}`);
            
            if (!field) continue;

            if (validateOnBlur) {
                field.addEventListener('blur', () => {
                    const result = this.validateField(field.value, validationRules[fieldName], fieldName);
                    this.highlightInvalidFields({ [fieldName]: result });
                    
                    if (!result.isValid) {
                        this.displayErrors(result.errors, { showFirstOnly: true });
                    }
                });
            }

            if (validateOnInput) {
                let timeout;
                field.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        const result = this.validateField(field.value, validationRules[fieldName], fieldName);
                        this.highlightInvalidFields({ [fieldName]: result });
                    }, debounceMs);
                });
            }
        }
    }
}

// Create global instance
window.ValidationManager = window.ValidationManager || new ValidationManager();