import { gql } from '@apollo/client';

// GQL queries for profiles and recipes
export const QUERY_PROFILES = gql`
  query allProfiles {
    profiles {
      _id
      username
      skills
    }
  }
`;

export const QUERY_SINGLE_PROFILE = gql`
  query singleProfile($profileId: ID!) {
    profile(profileId: $profileId) {
      _id
      username
      skills
    }
  }
`;

export const QUERY_ME = gql`
  query me {
    me {
      _id
      username
      skills
    }
  }
`;

export const GET_BEDS = gql`
  query GetBeds {
    beds {
      _id
      width
      length
      plants {
        _id
        plantType {
          _id
          name
          image
          waterReq
          spacing
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
    }
  }
`;