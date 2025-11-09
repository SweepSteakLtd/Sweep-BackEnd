export const database = {
  select: (..._args: any[]) => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => {
            throw new Error('database.select not mocked in test');
          },
        }),
      }),
    }),
  }),

  insert: (..._args: any[]) => ({
    values: () => ({
      execute: async () => {
        throw new Error('database.insert not mocked in test');
      },
    }),
  }),

  update: (..._args: any[]) => ({
    set: () => ({
      where: () => ({
        execute: async () => {
          throw new Error('database.update not mocked in test');
        },
      }),
    }),
  }),

  delete: (..._args: any[]) => ({
    set: () => ({
      where: () => ({
        execute: async () => {
          throw new Error('database.delete not mocked in test');
        },
      }),
    }),
  }),
} as any;

export const fetchRemoteConfig = jest.fn().mockResolvedValue({
  gbg_resource_id: 'd27b6807703eec9f5f5c0d45eb3abc883c142236055b85e30df2f75fdb22cbbe@1gobnzjz',
});
