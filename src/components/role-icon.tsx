import React from "react";
import { View } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faMoon,
  faSun,
  faBriefcase,
  faBookOpen,
  faDumbbell,
  faUsers,
  faHammer,
  faCar,
  faCoffee,
  faMobileAlt,
  faHeart,
  faMusic,
  faPalette,
  faCode,
  faPenFancy,
  faGamepad,
  faUtensils,
  faShower,
  faBaby,
  faDog,
  faPlane,
  faShoppingBag,
  faTv,
  faBolt,
  faQuestion,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

const ICON_MAP: Record<string, IconDefinition> = {
  moon: faMoon,
  sun: faSun,
  briefcase: faBriefcase,
  "book-open": faBookOpen,
  dumbbell: faDumbbell,
  users: faUsers,
  hammer: faHammer,
  car: faCar,
  coffee: faCoffee,
  smartphone: faMobileAlt,
  heart: faHeart,
  music: faMusic,
  palette: faPalette,
  code: faCode,
  "pen-tool": faPenFancy,
  "gamepad-2": faGamepad,
  utensils: faUtensils,
  "shower-head": faShower,
  baby: faBaby,
  dog: faDog,
  plane: faPlane,
  "shopping-bag": faShoppingBag,
  tv: faTv,
  zap: faBolt,
};

interface RoleIconProps {
  icon: string;
  color: string;
  size?: number;
  bgSize?: number;
  showBg?: boolean;
}

export function RoleIcon({
  icon,
  color,
  size = 18,
  bgSize = 40,
  showBg = true,
}: RoleIconProps) {
  const faIcon = ICON_MAP[icon] ?? faQuestion;

  if (!showBg) {
    return <FontAwesomeIcon icon={faIcon} size={size} color={color} />;
  }

  return (
    <View
      style={{
        width: bgSize,
        height: bgSize,
        borderRadius: bgSize / 2.5,
        backgroundColor: `${color}20`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FontAwesomeIcon icon={faIcon} size={size} color={color} />
    </View>
  );
}
