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
    homeLat: Float
    homeLon: Float
    climoStatus: String
    climoTileKey: String
    lastClimoBuiltAt: DateTime
    locationLabel: String
    city: String
    region: String
    country: String
  }

  type Auth {
    token: ID!
    profile: Profile!
  }

  input ProfileInput {
    username: String!
    email: String!
    password: String!
    homeLat: Float
    homeLon: Float
  }

  type GraceHours {
    cold: Int!
    heat: Int!
    dry: Int!
    wet: Int!
  }

  type Plant {
    _id: ID!
    name: String!
    image: String
    height: Float
    canopyRadius: FLoat
    sunReq: Float
    waterReq: String
    waterMin: Float
    waterMax: Float
    tempMin: Float
    tempMax: Float
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
    comments: String
    sunReq: Float
    baseGrowthRate: Float
    maxHeight: Float
    maxCanopyRadius: Float
    kcInitial: Float
    kcMid: Float
    kcLate: Float
    graceHours: GraceHours
    sunGraceDays: Int
  }
    
  input PlantPositionInput {
    plantInstanceId: ID!
    x: Int!
    y: Int!
}
  input GraceHoursInput {
    cold: Int
    heat: Int
    dry: Int
    wet: Int
  }

  input UpdatePlantStressInput {
    id: ID!
    tempMin: Float
    tempMax: Float
    waterMin: Float
    waterMax: Float
    graceHours: GraceHoursInput
    sunGraceDays: Int
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

  type ClimoStatus {
    ready: Boolean!
    latRounded: Float!
    lonRounded: Float!
    from: String
    to: String
    variables: [String!]
  }

  type HourlyNormals {
    hour: Int!
    temperature_2m: Float
    relativehumidity_2m: Float
    shortwave_radiation: Float
    precipitation: Float
    windspeed_10m: Float
  }

  type Query {
    profiles: [Profile]
    profile(profileId: ID!): Profile
    me: Profile
    plants: [Plant!]!
    beds: [Bed!]!
    getSunData (latitude: Float!, longitude: Float!, date: String): Sun
    growthSnapshots(plantInstanceId: ID!, from: Date, to: Date): [PlantGrowthSnapshot!]!
    climoStatus(lat: Float!, lon: Float!): ClimoStatus!
    normalsForDate(
      lat: Float!
      lon: Float!
      isoDate: String!
      variables: [String!] = [
        "temperature_2m",
        "relativehumidity_2m",
        "shortwave_radiation",
        "precipitation",
        "windspeed_10m"
      ]
    ): [HourlyNormals!]!
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
    setUserLocation(lat: Float!, lon: Float!): Profile!
    clearUserLocation: Profile!
    updatePlantStress(input: UpdatePlantStressInput!): Plant!
  }
`;

export default typeDefs;
