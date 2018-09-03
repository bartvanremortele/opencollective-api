import {
  GraphQLInt,
  GraphQLString,
} from 'graphql';

import {
  Account,
} from '../interface/Account';

import * as errors from '../errors';

import models from '../../../models';

const AccountQuery = {
  type: Account,
  args: {
    slug: { type: GraphQLString },
    id: { type: GraphQLInt }
  },
  resolve(_, args) {
    let collective;
    if (args.slug) {
      collective = models.Collective.findBySlug(args.slug.toLowerCase());
    } else if (args.id) {
      collective = models.Collective.findById(args.id);
    } else {
      return new Error("Please provide a slug or an id");
    }
    if (!collective) {
      throw new errors.NotFound("Collective not found");
    }
    return collective;
  }
}

export default AccountQuery;
