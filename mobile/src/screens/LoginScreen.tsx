import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useMobileAuth } from "../context/AuthContext";

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useMobileAuth();
  const [email, setEmail] = useState("simar@college.edu");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "teachers" | "leadership">("students");

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    }
  };

  const studentAccounts = [
    { label: "Simar (022)", email: "simar@college.edu", pass: "Student123!" },
    { label: "Aryan (002)", email: "0251bca002@college.edu", pass: "Student123!" },
    { label: "Prisha (003)", email: "0251bca003@college.edu", pass: "Student123!" },
    { label: "Akanksha (005)", email: "0251bca005@college.edu", pass: "Student123!" },
    { label: "Daksh (006)", email: "0251bca006@college.edu", pass: "Student123!" },
  ];

  const teacherAccounts = [
    { label: "MAG (Dr. Mansi)", email: "mag@college.edu", pass: "Teacher123!" },
    { label: "DSB (Dr. Daljeet)", email: "dsb@college.edu", pass: "Teacher123!" },
    { label: "MGS (Dr. Megha)", email: "mgs@college.edu", pass: "Teacher123!" },
    { label: "UG (Dr. Usha)", email: "ug@college.edu", pass: "Teacher123!" },
    { label: "MKC (Dr. Mahesh)", email: "mkc@college.edu", pass: "Teacher123!" },
    { label: "AK (Dr. Ajay)", email: "ak@college.edu", pass: "Teacher123!" },
    { label: "AKR (Mr. Amit)", email: "akr@college.edu", pass: "Teacher123!" },
    { label: "NPN (Mr. Nripesh)", email: "npn@college.edu", pass: "Teacher123!" },
    { label: "YK (Mr. Yashwant)", email: "yk@college.edu", pass: "Teacher123!" },
  ];

  const leadershipAccounts = [
    { label: "HOD (Dr. Mahesh)", email: "hod@college.edu", pass: "Hod123!" },
    { label: "Director", email: "director@college.edu", pass: "Director123!" },
    { label: "Admin", email: "admin@college.edu", pass: "Admin123!" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🏛 College ERP</Text>
        <Text style={styles.subtitle}>BCA III · Academic Operations</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>College Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.quickLabel}>Quick 1-Click Role Login:</Text>

        {/* Tab switchers */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "students" && styles.tabBtnActive]}
            onPress={() => setActiveTab("students")}
          >
            <Text style={[styles.tabBtnText, activeTab === "students" && styles.tabBtnTextActive]}>
              Students (5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "teachers" && styles.tabBtnActive]}
            onPress={() => setActiveTab("teachers")}
          >
            <Text style={[styles.tabBtnText, activeTab === "teachers" && styles.tabBtnTextActive]}>
              Professors (9)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "leadership" && styles.tabBtnActive]}
            onPress={() => setActiveTab("leadership")}
          >
            <Text style={[styles.tabBtnText, activeTab === "leadership" && styles.tabBtnTextActive]}>
              Leadership (3)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chips */}
        <View style={styles.quickRow}>
          {activeTab === "students" &&
            studentAccounts.map((r) => (
              <TouchableOpacity
                key={r.email}
                style={styles.roleChip}
                onPress={() => {
                  setEmail(r.email);
                  setPassword(r.pass);
                }}
              >
                <Text style={styles.roleChipText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

          {activeTab === "teachers" &&
            teacherAccounts.map((r) => (
              <TouchableOpacity
                key={r.email}
                style={styles.roleChip}
                onPress={() => {
                  setEmail(r.email);
                  setPassword(r.pass);
                }}
              >
                <Text style={styles.roleChipText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

          {activeTab === "leadership" &&
            leadershipAccounts.map((r) => (
              <TouchableOpacity
                key={r.email}
                style={styles.roleChip}
                onPress={() => {
                  setEmail(r.email);
                  setPassword(r.pass);
                }}
              >
                <Text style={styles.roleChipText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  errorText: {
    color: "#E11D48",
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  loginBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  quickLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#2563EB",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  roleChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleChipText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },
});
