import { supabase } from '../lib/supabase.js';

/**
 * Get suggested days of week for an allocation based on:
 * - Promoter's availability_days
 * - Existing allocations for the same promoter/store combination
 * - Even distribution across the week
 */
export async function getSuggestedDays(
  promoterId: string,
  brandId: string,
  storeId: string,
  frequencyPerWeek: number
): Promise<{
  suggestedDays: number[];
  availableDays: number[];
  conflictingAllocations: Array<{
    brand_id: string;
    brand_name: string;
    days: number[];
  }>;
}> {
  // Get promoter availability
  const { data: promoter } = await supabase
    .from('promoters')
    .select('availability_days')
    .eq('id', promoterId)
    .single();

  const availableDays = (promoter?.availability_days as number[]) || [1, 2, 3, 4, 5]; // Default to weekdays

  // Get existing allocations for this promoter/store combination
  const { data: existingAllocations } = await supabase
    .from('promoter_allocations')
    .select(`
      brand_id,
      days_of_week,
      brands!inner(name)
    `)
    .eq('promoter_id', promoterId)
    .eq('store_id', storeId)
    .eq('active', true)
    .neq('brand_id', brandId); // Exclude current brand

  const conflictingAllocations = (existingAllocations || []).map((alloc: any) => ({
    brand_id: alloc.brand_id,
    brand_name: alloc.brands?.name || 'Unknown',
    days: alloc.days_of_week || []
  }));

  // Get all conflicting days
  const conflictingDays = new Set<number>();
  conflictingAllocations.forEach(alloc => {
    alloc.days.forEach((day: number) => conflictingDays.add(day));
  });

  // Filter available days that don't conflict (but we'll still suggest them)
  const nonConflictingDays = availableDays.filter(day => !conflictingDays.has(day));
  const conflictingAvailableDays = availableDays.filter(day => conflictingDays.has(day));

  // Suggest days with priority:
  // 1. Non-conflicting days first
  // 2. Then conflicting days if needed
  let suggestedDays: number[] = [];

  // If we have enough non-conflicting days, use them
  if (nonConflictingDays.length >= frequencyPerWeek) {
    // Distribute evenly across available days
    suggestedDays = distributeDaysEvenly(nonConflictingDays, frequencyPerWeek);
  } else {
    // Use all non-conflicting days and fill with conflicting if needed
    suggestedDays = [...nonConflictingDays];
    const remaining = frequencyPerWeek - nonConflictingDays.length;
    if (remaining > 0 && conflictingAvailableDays.length > 0) {
      const additionalDays = distributeDaysEvenly(conflictingAvailableDays, remaining);
      suggestedDays.push(...additionalDays);
    }
  }

  // If still not enough, use any available days
  if (suggestedDays.length < frequencyPerWeek) {
    const needed = frequencyPerWeek - suggestedDays.length;
    const remainingDays = availableDays.filter(day => !suggestedDays.includes(day));
    suggestedDays.push(...remainingDays.slice(0, needed));
  }

  // Sort days
  suggestedDays.sort((a, b) => a - b);

  return {
    suggestedDays: suggestedDays.slice(0, frequencyPerWeek),
    availableDays,
    conflictingAllocations
  };
}

/**
 * Distribute days evenly across available days
 */
function distributeDaysEvenly(availableDays: number[], count: number): number[] {
  if (count >= availableDays.length) {
    return [...availableDays];
  }

  const step = availableDays.length / count;
  const selected: number[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor(i * step);
    selected.push(availableDays[index]);
  }

  // Remove duplicates and sort
  return [...new Set(selected)].sort((a, b) => a - b);
}
