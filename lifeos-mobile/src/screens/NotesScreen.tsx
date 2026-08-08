import { useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

/**
 * Legacy route — Notes and page notes live in one Library → Notes home now.
 * Keep this screen so old navigations to NotesList still land in the right place.
 */
export function NotesScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    navigation.replace("NotebooksList");
  }, [navigation]);

  return <View />;
}
