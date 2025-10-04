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
      plants
    }
  }
`;

export const ADD_PLANTS_TO_BED = gql`
  mutation AddPlantsToBed($bedId: ID!, $plants: [String!]!) {
    addPlantsToBed(bedId: $bedId, plants: $plants) {
      _id
      width
      length
      plants
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