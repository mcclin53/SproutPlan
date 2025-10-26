import { gql, useMutation } from '@apollo/client';

export const REGISTER = gql`
  mutation register($input: ProfileInput!) {
    register(input: $input) {
      token
      profile {
        _id
        username
        email
      }
    }
  }
`;


export const LOGIN_USER = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      profile {
        _id
        username
      }
    }
  }
`;

export const CREATE_BED = gql`
  mutation CreateBed($width: Int!, $length: Int!) {
    createBed(width: $width, length: $length) {
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

export const MOVE_BED = gql`
  mutation MoveBed($bedId: ID!, $position: PositionInput!) {
    moveBed(bedId: $bedId, position: $position) {
      _id
      x
      y
    }
  }
`;

export const ADD_PLANTS_TO_BED = gql`
  mutation AddPlantsToBed($bedId: ID!, $basePlantIds: [ID!]!, $positions: [PositionInput!]!) {
    addPlantsToBed(bedId: $bedId, basePlantIds: $basePlantIds, positions: $positions) {
      _id
      width
      length
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

export const REMOVE_PLANTS_FROM_BED = gql`
  mutation RemovePlantsFromBed($bedId: ID!, $plantInstanceIds: [ID!]!) {
    removePlantsFromBed(bedId: $bedId, plantInstanceIds: $plantInstanceIds) {
      _id
      width
      length
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

export const MOVE_PLANT_IN_BED = gql`
  mutation MovePlantInBed($bedId: ID!, $position: PlantPositionInput!) {
    movePlantInBed(bedId: $bedId, position: $position) {
      _id
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

export const REMOVE_BED = gql`
  mutation RemoveBed($bedId: ID!) {
    removeBed(bedId: $bedId) {
      _id
    }
  }
`;

export const CLEAR_BEDS = gql`
  mutation ClearBeds {
    clearBeds {
      _id
    }
  }
`;

export const APPLY_MIDNIGHT_GROWTH = gql`
  mutation ApplyMidnightGrowth(
    $bedId: ID!,
    $plantInstanceId: ID!,
    $day: Date!,
    $sunlightHours: Float!,
    $shadedHours: Float,
    $modelVersion: String!,
    $inputs: JSON
  ) {
    applyMidnightGrowth(
      bedId: $bedId,
      plantInstanceId: $plantInstanceId,
      day: $day,
      sunlightHours: $sunlightHours,
      shadedHours: $shadedHours,
      modelVersion: $modelVersion,
      inputs: $inputs
    ) {
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