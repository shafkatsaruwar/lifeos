import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MasterOSProvider } from "../lib/masteros/MasterOSContext";
import { MasterOSHubScreen } from "../screens/masteros/MasterOSHubScreen";
import { MasterOSTeachScreen } from "../screens/masteros/MasterOSTeachScreen";
import { MasterOSWhiteboardScreen } from "../screens/masteros/MasterOSWhiteboardScreen";
import { MasterOSGradeScreen } from "../screens/masteros/MasterOSGradeScreen";
import { MasterOSReportScreen } from "../screens/masteros/MasterOSReportScreen";

export type MasterOSStackParamList = {
  MasterOSHub: undefined;
  MasterOSTeach: { lessonId: string };
  MasterOSWhiteboard: { lessonId: string };
  MasterOSGrade: { assignmentId: string };
  MasterOSReport: { studentId: string };
};

const Stack = createNativeStackNavigator<MasterOSStackParamList>();

export function MasterOSNavigator() {
  return (
    <MasterOSProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="MasterOSHub" component={MasterOSHubScreen} />
        <Stack.Screen name="MasterOSTeach" component={MasterOSTeachScreen} />
        <Stack.Screen name="MasterOSWhiteboard" component={MasterOSWhiteboardScreen} />
        <Stack.Screen name="MasterOSGrade" component={MasterOSGradeScreen} />
        <Stack.Screen name="MasterOSReport" component={MasterOSReportScreen} />
      </Stack.Navigator>
    </MasterOSProvider>
  );
}
