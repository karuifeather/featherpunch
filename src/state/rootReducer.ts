import { combineReducers } from 'redux';
import userReducer from './userSlice';
import settingsReducer from './settingsSlice';

const rootReducer = combineReducers({
  user: userReducer,
  settings: settingsReducer,
});

export default rootReducer;
