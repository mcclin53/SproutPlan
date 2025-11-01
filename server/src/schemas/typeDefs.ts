import { gql } from 'apollo-server-express';

const typeDefs = gql`
  scalar JSON
  scalar Date
  scalar DateTime

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
    sunReq: Float
    baseGrowthRate: Float
    maxHeight: Float
    maxCanopyRadius: Float
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
    height: Float
    canopyRadius: Float
    lastSimulatedAt: DateTime
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

  type PlantGrowthSnapshot {
    _id: ID!
    plantInstanceId: ID!
    bedId: ID!
    day: Date!
    sunlightHours: Float!
    shadedHours: Float
    tempOkHours: Float
    height: Float!
    canopyRadius: Float!
    modelVersion: String!
    inputs: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Sun {
    _id: ID!
    location: Location!
    date: String
    sunrise: String
    sunset: String
    solarNoon: String
    daylightDuration: Int
    solarElevation: Float
    solarAzimuth: Float
    updatedAt: String
}

type Location {
  latitude: Float!
  longitude: Float!
}

  type Query {
    profiles: [Profile]
    profile(profileId: ID!): Profile
    me: Profile
    plants: [Plant!]!
    beds: [Bed!]!
    getSunData (latitude: Float!, longitude: Float!, date: String): Sun
    growthSnapshots(plantInstanceId: ID!, from: Date, to: Date): [PlantGrowthSnapshot!]!
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
    applyMidnightGrowth(
      bedId: ID!
      plantInstanceId: ID!
      day: Date!
      sunlightHours: Float!
      shadedHours: Float
      tempOkHours: Float
      modelVersion: String!
      inputs: JSON
    ): PlantGrowthSnapshot!
  }
`;

export default typeDefs;
