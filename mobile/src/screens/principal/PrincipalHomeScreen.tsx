import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { mobileApi } from "../../api/client";
import { useMobileAuth } from "../../context/AuthContext";

export const PrincipalHomeScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();
  const [deptPerf, setDeptPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const res = await mobileApi.get("/reports/principal/department-performance");
        setDeptPerf(res.data);
      } catch (err) {
        console.error("Failed to load department performance", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerf();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Principal Executive Desk</Text>
          <Text style={styles.subGreeting}>College Overview · {user?.full_name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Top 4 Stat Boxes */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>1,248</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>124</Text>
          <Text style={styles.statLabel}>Faculty</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>6</Text>
          <Text style={styles.statLabel}>Depts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#059669" }]}>100%</Text>
          <Text style={styles.statLabel}>Timetable</Text>
        </View>
      </View>

      {/* Department Performance Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Department Performance</Text>
        <Text style={styles.sectionSubtitle}>Enrollment, faculty & average attendance</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : (
          deptPerf.map((d) => (
            <View key={d.department_code} style={styles.deptCard}>
              <View style={styles.deptLeft}>
                <Text style={styles.deptCode}>{d.department_code}</Text>
                <Text style={styles.deptName}>{d.department_name}</Text>
                <Text style={styles.deptMeta}>
                  {d.students_count} Students · {d.faculty_count} Faculty
                </Text>
              </View>
              <View style={styles.deptRight}>
                <View style={styles.attBadge}>
                  <Text style={styles.attBadgeText}>{d.avg_attendance_pct}% Att.</Text>
                </View>
                <Text style={styles.passRateText}>{d.pass_percentage}% Pass</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },
  subGreeting: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  logoutText: {
    fontSize: 11,
    color: "#E11D48",
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statNum: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
  },
  deptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deptLeft: {
    flex: 1,
  },
  deptCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  deptName: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
  },
  deptMeta: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },
  deptRight: {
    alignItems: "flex-end",
  },
  attBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#065F46",
  },
  passRateText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 4,
  },
});
