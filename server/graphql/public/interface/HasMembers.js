import {
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLInterfaceType,
} from 'graphql';

import models, { Op } from '../../../models';

export const HasMemberFields = {
  members: {
    description: 'Get all members (admins, members, backers, followers)',
    type: new GraphQLList(MemberType),
    args: {
      limit: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      type: { type: GraphQLString },
      role: { type: GraphQLString },
      TierId: { type: GraphQLInt },
      tierSlug: { type: GraphQLString },
      roles: { type: new GraphQLList(GraphQLString) },
    },
    resolve(collective, args) {
      const query = {
        limit: args.limit,
        offset: args.offset,
      };

      query.where = { CollectiveId: collective.id };
      if (args.TierId) query.where.TierId = args.TierId;
      const roles = args.roles || (args.role && [args.role]);

      if (roles && roles.length > 0) {
        query.where.role = { [Op.in]: roles };
      }

      let conditionOnMemberCollective;
      if (args.type) {
        const types = args.type.split(',');
        conditionOnMemberCollective = { type: { [Op.in]: types } };
      }

      query.include = [
        {
          model: models.Collective,
          as: 'memberCollective',
          required: true,
          where: conditionOnMemberCollective,
        },
      ];

      if (args.tierSlug) {
        query.include.push({
          model: models.Tier,
          where: { slug: args.tierSlug },
        });
      }

      return models.Member.findAll(query);
    },
  },
};

export const HasMember = new GraphQLInterfaceType({
  name: 'HasMember',
  description: 'HasMember interface',
  fields: () => {
    return {
      members: {
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
