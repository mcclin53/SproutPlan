import { gql } from '@apollo/client';

// GQL queries for profiles and recipes
export const QUERY_PROFILES = gql`
  query allProfiles {
    profiles {
      _id
      username
    }
  }
`;

export const QUERY_SINGLE_PROFILE = gql`
  query singleProfile($profileId: ID!) {
    profile(profileId: $profileId) {
      _id
      username
    }
  }
`;

export const QUERY_ME = gql`
  query me {
    me {
      _id
      username
      homeLat
      homeLon
      locationLabel
      city
      region
      country
      climoStatus
      role
    }
  }
`;

export const GET_BEDS = gql`
  query GetBeds {
    beds {
      _id
      width
      length
      x
      y
      plantInstances  {
        _id
        x
        y
        height
        canopyRadius
        lastSimulatedAt
        basePlant {
          _id
          name
          image
          waterReq
          spacing
          sunReq
          baseGrowthRate
          maxHeight
          maxCanopyRadius
        }
      }
    }
  }
`;

export const GET_PLANTS = gql`
  query GetPlants {
    plants {
      _id
      name
      image
      sunReq
      baseGrowthRate
      maxHeight
      maxCanopyRadius
    }
  }
`;

export const GET_SUN_DATA = gql`
  query GetSunData($latitude: Float!, $longitude: Float!, $date: String) {
    getSunData(latitude: $latitude, longitude: $longitude, date: $date) {
      sunrise
      sunset
      solarNoon
      solarElevation
      solarAzimuth
      daylightDuration
    }
  }
`;

export const GET_GROWTH_SNAPSHOTS = gql`
  query GrowthSnapshots($plantInstanceId: ID!, $from: Date, $to: Date) {
    growthSnapshots(plantInstanceId: $plantInstanceId, from: $from, to: $to) {
      _id
      day
      sunlightHours
      height
      canopyRadius
      modelVersion
      createdAt
      updatedAt
    }
  }
`;