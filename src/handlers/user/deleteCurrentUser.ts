import { NextFunction, Request, Response } from 'express';

/**
 * Delete current user (authenticated endpoint)
 * @returns void
 */
export const deleteCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Mock successful deletion - return 204 No Content
    // In a real implementation, you would delete the user from the database
    return res.status(204).send({ data: {}, is_mock: true });
  } catch (error: any) {
    console.log(`DELETE CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// for now endpoint is deprecated
// deleteCurrentUserHandler.apiDescription = {
//   responses: {
//     204: {
//       description: '204 No Content',
//     },
//     403: {
//       description: '403 Forbidden',
//       content: {
//         'application/json': {
//           schema: {
//             type: 'object',
//             properties: {
//               error: { type: 'string' },
//               message: { type: 'string' },
//             },
//           },
//         },
//       },
//     },
//     500: {
//       description: '500 Internal Server Error',
//       content: {
//         'application/json': {
//           schema: {
//             type: 'object',
//             properties: {
//               error: { type: 'string' },
//               message: { type: 'string' },
//             },
//           },
//         },
//       },
//     },
//   },
// };
