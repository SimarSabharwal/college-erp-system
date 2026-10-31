import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useMobileAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { StudentHomeScreen } from "../screens/student/StudentHomeScreen";
import { StudentAttendanceScreen } from "../screens/student/StudentAttendanceScreen";
import { StudentTimetableScreen } from "../screens/student/StudentTimetableScreen";
import { TeacherHomeScreen } from "../screens/teacher/TeacherHomeScreen";
import { HODHomeScreen } from "../screens/hod/HODHomeScreen";
import { AdminHomeScreen } from "../screens/admin/AdminHomeScreen";
import { PrincipalHomeScreen } from "../screens/principal/PrincipalHomeScreen";

export const RootNavigator: React.FC = () => {
  const { user } = useMobileAuth();
  const [studentTab, setStudentTab] = React.useState<"home" | "attendance" | "timetable">("home");

  if (!user) {
    return <LoginScreen />;
  }

  // Student Role: Tab layout
  if (user.role === "Student") {
    return (
      <View style={styles.appContainer}>
        <View style={styles.contentContainer}>
          {studentTab === "home" && <StudentHomeScreen />}
          {studentTab === "attendance" && <StudentAttendanceScreen />}
          {studentTab === "timetable" && <StudentTimetableScreen />}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setStudentTab("home")}
          >
            <Text style={[styles.tabLabel, studentTab === "home" && styles.activeTabLabel]}>
              🏠 Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setStudentTab("attendance")}
          >
            <Text style={[styles.tabLabel, studentTab === "attendance" && styles.activeTabLabel]}>
              📊 Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setStudentTab("timetable")}
          >
            <Text style={[styles.tabLabel, studentTab === "timetable" && styles.activeTabLabel]}>
              📅 Timetable
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Teacher Role
  if (user.role === "Teacher") {
    return (
      <View style={styles.appContainer}>
        <TeacherHomeScreen />
      </View>
    );
  }

  // HOD Role
  if (user.role === "HOD") {
    return (
      <View style={styles.appContainer}>
        <HODHomeScreen />
      </View>
    );
  }

  // Admin Role
  if (user.role === "Admin") {
    return (
      <View style={styles.appContainer}>
        <AdminHomeScreen />
      </View>
    );
  }

  // Principal Role
  return (
    <View style={styles.appContainer}>
      <PrincipalHomeScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
  },
  activeTabLabel: {
    color: "#2563EB",
  },
});
