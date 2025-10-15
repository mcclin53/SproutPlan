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

  input ProfileInput {
    username: String!
    email: String!
    password: String!
  }

  type Plant {
    _id: ID!
    name: String!
    image: String
    waterReq: String
    nutrients: String
    pH: Float
    spacing: Int
    companions: [String]
    enemies: [String]
    diseases: [String]
    pests: [String]
    daysToHarvest: Int
    harvestAvg: Int
    perennial: Boolean
    annual: Boolean
    frostZone: String
    idealTemp: Int
    comments: String
  }
    
  input PlantPositionInput {
    plantInstanceId: ID!
    x: Int!
    y: Int!
}
  type PlantInstance {
    _id: ID!
    basePlant: Plant!
    plantedAt: String
    x: Int!
    y: Int!
  }

  type Bed {
    _id: ID!
    width: Int!
    length: Int!
    x: Int
    y: Int
    plantInstances: [PlantInstance]
  }
  
  input PositionInput {
    x: Int!
    y: Int!
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
    addPlantsToBed(bedId: ID!, basePlantIds: [ID!]!, positions: [PositionInput!]!): Bed
    removeBed(bedId:ID!) :Bed
    removePlantsFromBed(bedId: ID!, plantInstanceIds: [ID!]!): Bed
    clearBeds: [Bed!]!
    moveBed(bedId: ID!, position: PositionInput!): Bed
    movePlantInBed(bedId: ID!, position: PlantPositionInput!): Bed!
  }
`;

export default typeDefs;
