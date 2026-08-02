import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAIRO_REGIONS } from '../constants/cairoRegions';
import {
  CAIRO_GOVERNORATE,
  formatCairoAreaRegion,
  isCairoRegionValue,
  OTHER_EGYPT_REGIONS,
} from '../constants/regions';
import { useAppPreferences } from '../context/AppPreferences';

type RegionPickerProps = {
  value: string;
  onChange: (region: string) => void;
  placeholder?: string;
};

export default function RegionPicker({ value, onChange, placeholder = 'Select region' }: RegionPickerProps) {
  const { theme, t } = useAppPreferences();
  const styles = makeStyles(theme);
  const [open, setOpen] = useState(false);
  const [cairoExpanded, setCairoExpanded] = useState(isCairoRegionValue(value));

  const select = (region: string) => {
    onChange(region);
    setOpen(false);
    setCairoExpanded(isCairoRegionValue(region));
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && isCairoRegionValue(value)) setCairoExpanded(true);
      return next;
    });
  };

  return (
    <View>
      <TouchableOpacity style={styles.dropdown} onPress={toggleOpen}>
        <Text style={[styles.dropdownText, !value && { color: theme.muted }]} numberOfLines={2}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
      </TouchableOpacity>

      {open ? (
        <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setCairoExpanded(!cairoExpanded);
            }}
          >
            <View style={styles.cairoRow}>
              <Text style={[styles.dropdownItemText, isCairoRegionValue(value) && { color: theme.primary, fontWeight: '900' }]}>
                {CAIRO_GOVERNORATE}
              </Text>
              <Ionicons name={cairoExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
            </View>
          </TouchableOpacity>

          {cairoExpanded ? (
            <View style={styles.cairoSublist}>
              <TouchableOpacity style={styles.subItem} onPress={() => select(CAIRO_GOVERNORATE)}>
                <Text style={[styles.subItemText, value === CAIRO_GOVERNORATE && { color: theme.primary, fontWeight: '900' }]}>
                  {t('cairoAllAreas')}
                </Text>
              </TouchableOpacity>

              {CAIRO_REGIONS.map((region) => (
                <View key={region.key}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: region.color }]} />
                    <Text style={styles.sectionTitle}>{t(region.labelKey)}</Text>
                  </View>
                  {region.areas.map((area) => {
                    const regionValue = formatCairoAreaRegion(area.name);
                    return (
                      <TouchableOpacity key={area.name} style={styles.subItem} onPress={() => select(regionValue)}>
                        <Text style={[styles.subItemText, value === regionValue && { color: theme.primary, fontWeight: '900' }]}>
                          {area.name}
                        </Text>
                        {area.alias && area.alias !== area.name ? (
                          <Text style={styles.subItemAlias}>{area.alias}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}

          {OTHER_EGYPT_REGIONS.map((region) => (
            <TouchableOpacity key={region} style={styles.dropdownItem} onPress={() => select(region)}>
              <Text style={[styles.dropdownItemText, value === region && { color: theme.primary, fontWeight: '900' }]}>
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  dropdown: {
    backgroundColor: theme.input,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dropdownText: { color: theme.text, fontSize: 15, flex: 1 },
  dropdownMenu: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    maxHeight: 320,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemText: { color: theme.text, fontSize: 14 },
  cairoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cairoSublist: { backgroundColor: theme.input, borderBottomWidth: 1, borderBottomColor: theme.border },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: theme.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  subItem: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  subItemText: { color: theme.text, fontSize: 14 },
  subItemAlias: { color: theme.muted, fontSize: 12, marginTop: 2 },
});
