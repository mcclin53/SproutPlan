import { gql } from 'apollo-server-express';

const typeDefs = gql`

type Profile {
    _id: ID!
    username: String!
    email: String!
    password: String!
    saved: [Bed]
}

  type Auth {
    token: ID!
    profile: Profile!
  }
    type Plant {
    _id: ID!
    name: String!
    }

  input ProfileInput {
    username: String!
    email: String!
    password: String!
  }

    type Plant {
  _id: ID!
  name: String!
}

type Bed {
  _id: ID!
  width: Int!
  length: Int!
  plants: [String!]!
}

  type Query {
    profiles: [Profile]
    profile(profileId: ID!): Profile
    me: Profile
    plants: [Plant!]!
    beds: [Bed!]!
    }

    type Mutation {
        login(email: String!, password: String!): Auth
        register(input: ProfileInput!): Auth
        removeProfile: Profile
        createBed(width: Int!, length: Int!): Bed!
        addPlantsToBed(bedId: ID!, plantIds: [ID!]!): Bed
        removeBed(bedId:ID!) :Bed
        clearBeds: [Bed!]!
        }
`;

export default typeDefs;
