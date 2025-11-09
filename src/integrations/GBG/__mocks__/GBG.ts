export const verifyIdentity = jest.fn().mockResolvedValue({
  decision: 'Decision: Pass 1+1',
  instanceId: 'test-instance-id',
});

export const handleGBGError = jest.fn().mockReturnValue({
  message: 'Test error message',
  code: 'TEST_ERROR',
});
