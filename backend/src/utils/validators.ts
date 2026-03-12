import Joi from 'joi';

// Auth validation schemas
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(12)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 12 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number and one special character',
      'any.required': 'Password is required'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const enable2FASchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'any.required': 'User ID is required'
    })
});

export const verify2FASchema = Joi.object({
  tempToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Temporary token is required'
    }),
  token: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': '2FA token must be 6 digits',
      'string.pattern.base': '2FA token must be numeric',
      'any.required': '2FA token is required'
    })
});

export const verify2FASetupSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'any.required': 'User ID is required'
    }),
  token: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': '2FA token must be 6 digits',
      'string.pattern.base': '2FA token must be numeric',
      'any.required': '2FA token is required'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// User ID param schema
export const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'any.required': 'User ID is required'
    })
});
