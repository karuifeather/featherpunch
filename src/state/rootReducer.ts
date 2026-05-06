import { combineReducers } from "redux";
import settingsReducer from "./settingsSlice";

const rootReducer = combineReducers({
  settings: settingsReducer,
});

export default rootReducer;
