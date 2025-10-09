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
      plantInstances  {
        _id
        basePlant {
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
  mutation AddPlantsToBed($bedId: ID!, $basePlantIds: [ID!]!) {
    addPlantsToBed(bedId: $bedId, basePlantIds: $basePlantIds) {
      _id
      width
      length
      plantInstances  {
        _id
        basePlant {
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

export const REMOVE_PLANTS_FROM_BED = gql`
  mutation RemovePlantsFromBed($bedId: ID!, $plantInstanceIds: [ID!]!) {
    removePlantsFromBed(bedId: $bedId, plantInstanceIds: $plantInstanceIds) {
      _id
      width
      length
      plantInstances  {
        _id
        basePlant {
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