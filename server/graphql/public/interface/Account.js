import { GraphQLInt, GraphQLString, GraphQLInterfaceType } from 'graphql';

export const AccountFields = {
  id: {
    type: GraphQLInt,
    resolve(collective) {
      return collective.id;
    },
  },
  slug: {
    type: GraphQLString,
    resolve(collective) {
      return collective.slug;
    },
  },
  name: {
    type: GraphQLString,
    resolve(collective) {
      return collective.name;
    },
  },
};

export const Account = new GraphQLInterfaceType({
  name: 'Account',
  description: 'Account interface',
  fields: () => {
    return {
      id: {
        type: GraphQLInt,
      },
      slug: {
        type: GraphQLString,
      },
      name: {
        type: GraphQLString,
      },
    };
  },
});
