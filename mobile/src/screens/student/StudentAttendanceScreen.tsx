import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { mobileApi } from "../../api/client";

export const StudentAttendanceScreen: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await mobileApi.get("/attendance/me/dashboard");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load attendance", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Tier 1 Header Banner */}
      <View style={styles.banner}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{data?.overall_percentage}%</Text>
          <Text style={styles.scoreLabel}>Overall</Text>
        </View>
        <View style={styles.bannerStats}>
          <Text style={styles.semesterTitle}>Semester 3 Attendance</Text>
          <Text style={styles.statLine}>
            Lectures: <Text style={styles.bold}>{data?.total_attended}</Text> / {data?.total_held} Attended
          </Text>
          <Text style={styles.statLine}>
            Absent: <Text style={styles.roseText}>{data?.total_absent}</Text> classes
          </Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>Status: {data?.overall_status}</Text>
          </View>
        </View>
      </View>

      {/* Tier 2 Subject Cards (Critical First) */}
      <Text style={styles.sectionHeading}>Subject-Wise Status (Critical First)</Text>

      {data?.subject_cards.map((c: any) => {
        const isCritical = c.status === "Critical";
        const isAtRisk = c.status === "At Risk";

        return (
          <View
            key={c.subject_id}
            style={[
              styles.card,
              isCritical && styles.criticalCard,
              isAtRisk && styles.atRiskCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.codeText}>{c.subject_code}</Text>
                <Text style={styles.subjectText}>{c.subject_name}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  isCritical && styles.criticalBadge,
                  isAtRisk && styles.atRiskBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isCritical && styles.criticalBadgeText,
                    isAtRisk && styles.atRiskBadgeText,
                  ]}
                >
                  {c.status}
                </Text>
              </View>
            </View>

            <View style={styles.numbersRow}>
              <Text style={styles.percentageText}>{c.percentage}%</Text>
              <Text style={styles.countText}>
                {c.attended_classes} / {c.total_classes_held} Lectures
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(c.percentage, 100)}%` },
                  isCritical
                    ? { backgroundColor: "#EF4444" }
                    : isAtRisk
                    ? { backgroundColor: "#F59E0B" }
                    : { backgroundColor: "#10B981" },
                ]}
              />
            </View>

            <Text style={styles.marginText}>{c.margin_note}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
  },
  scoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  scoreLabel: {
    color: "#BFDBFE",
    fontSize: 10,
    textTransform: "uppercase",
  },
  bannerStats: {
    flex: 1,
  },
  semesterTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  statLine: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  bold: {
    fontWeight: "bold",
    color: "#059669",
  },
  roseText: {
    fontWeight: "bold",
    color: "#E11D48",
  },
  statusChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#B45309",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  criticalCard: {
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
  },
  atRiskCard: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  codeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0F172A",
  },
  badge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#065F46",
  },
  criticalBadge: {
    backgroundColor: "#FFE4E6",
  },
  criticalBadgeText: {
    color: "#9F1239",
  },
  atRiskBadge: {
    backgroundColor: "#FEF3C7",
  },
  atRiskBadgeText: {
    color: "#92400E",
  },
  numbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    marginBottom: 6,
  },
  percentageText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },
  countText: {
    fontSize: 11,
    color: "#64748B",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  marginText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    marginTop: 8,
  },
});
