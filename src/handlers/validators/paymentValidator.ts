import { body } from 'express-validator';

export const initiatePaymentValidator = [
  body('amount')
    .isInt({ min: 100 }) // Minimum $1.00
    .withMessage('Amount must be at least 100 (cents)'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
];

export const confirmPaymentValidator = [
  body('transactionId')
    .isString()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('paymentHandleToken')
    .isString()
    .notEmpty()
    .withMessage('Payment handle token is required'),
  body('paymentMethod')
    .optional()
    .isString(),
];
