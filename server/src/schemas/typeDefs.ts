import { gql } from 'apollo-server-express';

const typeDefs = gql`

type Profile {
    _id: ID!
    username: String!
    email: String!
    password: String!
    saved: [Plot]
}

    type Auth {
    token: ID!
    profile: Profile!
  }

  input ProfileInput {
    username: String!
    email: String!
    password: String!
  }

  type Query {
    profiles: [Profile]
    profile(profileId: ID!): Profile
    me: Profile
    }

    type Mutation {
        login(email: String!, password: String!): Auth
        register(input: ProfileInput!): Auth
        removeProfile: Profile
        }
`;

export default typeDefs;
