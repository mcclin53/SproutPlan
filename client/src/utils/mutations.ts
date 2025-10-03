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
  mutation CreateBed($width: Int!, $length: Int!, $plants: [String!]!) {
    createBed(width: $width, length: $length, plants: $plants) {
      _id
      width
      length
      plants
    }
  }
`;