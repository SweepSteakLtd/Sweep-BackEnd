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
