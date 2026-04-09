import userRequest from './userRequest';

export function getUserInfo() {
  return userRequest.get('/auth/info');
}
