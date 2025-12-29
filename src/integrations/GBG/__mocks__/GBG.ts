export const verifyIdentity = jest.fn().mockResolvedValue({
  decision: 'Decision: Pass 1+1',
  instanceId: 'test-instance-id',
});

export const handleGBGError = jest.fn().mockReturnValue({
  message: 'Test error message',
  code: 'TEST_ERROR',
});

export const getAuthToken = jest.fn().mockResolvedValue({
  access_token: 'mock-token-12345',
  token_type: 'Bearer',
  expires_in: 14400,
});

export const fetchState = jest.fn().mockResolvedValue({
  status: 'Completed',
  data: {
    context: {
      process: {
        flow: {
          step1: {
            _ggo: { key: 'value' },
            result: { outcome: 'Decision: Pass 1+1' },
          },
        },
      },
      result: {
        status: 'pending',
      },
    },
  },
});

export const retrieveTasks = jest.fn().mockResolvedValue({
  status: 'InProgress',
  instanceId: 'test-instance-123',
  tasks: [
    {
      taskId: 'task-123',
      variantId: 'variant-123',
    },
  ],
});

export const submitDocumentsToTask = jest.fn().mockResolvedValue({
  status: 'Completed',
  instanceId: 'test-instance-123',
});

export const retryWithBackoff = jest.fn().mockImplementation(async (fn) => {
  return await fn();
});
