import {
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';

import dataloaderSequelize from 'dataloader-sequelize';

import models from '../../models';

dataloaderSequelize(models.Order);
dataloaderSequelize(models.Transaction);
dataloaderSequelize(models.Collective);
dataloaderSequelize(models.Expense);

import types from './types';

import query from './query';

// import mutation from './mutation';

const Query = new GraphQLObjectType({
  name: 'Query',
  description: 'This is the root query',
  fields: () => {
    return query
  }
});

// const Mutation = new GraphQLObjectType({
//   name: 'Mutation',
//   description: 'This is the root mutation',
//   // fields: () => {
//   //   return mutation
//   // }
// })

const Schema = new GraphQLSchema({
  types: types,
  query: Query,
  // mutation: Mutation
});

export default Schema
