// Port of web/src/pages/Profile.tsx. Photos from camera or library.
import { useEffect, useState } from 'react'
import { ActionSheetIOS, Alert as RNAlert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { isProfileComplete, useAuth } from '../../../lib/auth'
import {
  MAX_PHOTOS, ageFrom, defaultDob, deletePhoto, dobToIso, errorText, getMyPhone, photoUrls, saveProfile, setFrozen, uploadPhoto,
  type Dob, type Photo,
} from '../../../lib/api'
import { prepareImage, type PreparedImage } from '../../../lib/image'
import { colors, radius } from '../../../lib/theme'
import { GearIcon, LockIcon } from '../../../components/Icons'
import DobPicker from '../../../components/DobPicker'
import NotificationSettingsPanel from '../../../components/NotificationSettingsPanel'
import { Alert, Button, Field, H, Input, Panel, T } from '../../../components/ui'

type Slot = { kind: 'existing'; photo: Photo; url: string } | ({ kind: 'new' } & PreparedImage) | null

export default function Profile() {
  const { session, profile, status, refreshProfile } = useAuth()
  const uid = session!.user.id
  const [editing, setEditing] = useState(!profile)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [dob, setDob] = useState<Dob>(defaultDob)
  const [freezeBusy, setFreezeBusy] = useState(false)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [slots, setSlots] = useState<Slot[]>([null, null, null])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Load (or reset to) the stored profile.
  async function reset() {
    setName(profile?.name ?? '')
    setAge(profile ? String(profile.age) : '')
    setLocation(profile?.location ?? '')
    setDescription(profile?.description ?? '')
    const photos = profile?.photos ?? []
    const map = photos.length ? await photoUrls(photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>) : {}
    setSlots([1, 2, 3].map((pos) => {
      const p = photos.find((x) => x.position === pos)
      return p ? { kind: 'existing', photo: p, url: map[p.path] ?? '' } : null
    }))
    if (profile) setPhone((await getMyPhone().catch(() => null)) ?? '')
  }

  useEffect(() => {
    void reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function pick(index: number, source: 'camera' | 'library') {
    setError('')
    try {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) throw new Error(`Please allow ${source === 'camera' ? 'camera' : 'photo'} access in iPhone Settings → Kitho.`)
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 }
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
      const asset = res.canceled ? null : res.assets[0]
      if (!asset) return
      const prepared = await prepareImage(asset.uri, asset.width, asset.height)
      setSlots((s) => s.map((slot, i) => (i === index ? { kind: 'new', ...prepared } : slot)))
    } catch (e) {
      setError(errorText(e))
    }
  }

  function choose(index: number) {
    const filled = !!slots[index]
    const options = ['Take photo', 'Choose from library', ...(filled ? ['Remove photo'] : []), 'Cancel']
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: filled ? 2 : undefined },
      (i) => {
        if (i === 0) void pick(index, 'camera')
        else if (i === 1) void pick(index, 'library')
        else if (filled && i === 2) setSlots((s) => s.map((slot, n) => (n === index ? null : slot)))
      },
    )
  }

  async function onSave() {
    setError('')
    setSaved(false)
    if (!name.trim() || !location.trim()) return setError('Please fill in your name and location.')
    if (!profile && ageFrom(dob) < 18) return setError('You must be 18 or over to use Kitho.')
    if (!slots.some(Boolean)) return setError('Please add at least one photo.')

    setBusy(true)
    try {
      await saveProfile(uid, {
        name: name.trim(),
        ...(profile ? {} : { birth_date: dobToIso(dob) }),
        location: location.trim(),
        description: description.trim(),
        phone: phone.trim() || null,
      }, !!profile)

      const existing = profile?.photos ?? []
      for (let i = 0; i < MAX_PHOTOS; i++) {
        const pos = i + 1
        const orig = existing.find((p) => p.position === pos)
        const slot = slots[i]
        if (slot?.kind === 'new') await uploadPhoto(uid, slot.body, slot.contentType, pos, orig)
        else if (!slot && orig) await deletePhoto(orig)
      }
      const firstTime = !isProfileComplete(profile)
      await refreshProfile()
      setEditing(false)
      setSaved(true)
      if (firstTime) router.replace('/feed')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function onToggleFreeze() {
    const freeze = !status?.frozen
    const go = async () => {
      setFreezeBusy(true)
      setError('')
      try {
        await setFrozen(uid, freeze)
        await refreshProfile()
      } catch (err) {
        setError(errorText(err))
      } finally {
        setFreezeBusy(false)
      }
    }
    if (!freeze) return go()
    RNAlert.alert('Freeze profile?', 'You’ll be hidden from Discover. Open chats stay open.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Freeze', onPress: () => void go() },
    ])
  }

  function onCancel() {
    setError('')
    setEditing(false)
    void reset()
  }

  const ro = !editing || busy
  const email = session!.user.email ?? ''

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.head}>
            <H style={{ marginBottom: 0, flexShrink: 1 }}>{profile ? 'My profile' : 'Create your profile'}</H>
            <View style={s.headBtns}>
              <Pressable style={s.iconBtn} onPress={() => router.push('/settings')} accessibilityLabel="Settings"><GearIcon /></Pressable>
              {editing ? (
                <>
                  {profile && <Button small kind="ghost" title="Cancel" onPress={onCancel} disabled={busy} />}
                  <Button small title={busy ? 'Saving…' : 'Save'} onPress={onSave} disabled={busy} />
                </>
              ) : (
                <Button small title="Edit" onPress={() => { setSaved(false); setEditing(true) }} />
              )}
            </View>
          </View>

          {!profile && <Alert kind="ok">Add your details and at least one photo to start browsing.</Alert>}
          {saved && <Alert kind="ok">Profile saved.</Alert>}
          {!!error && <Alert kind="error">{error}</Alert>}

          <Panel>
            <T weight="medium" size={14} style={{ marginBottom: 10 }}>Photos <T muted size={13}>(1–3, first one is your main photo)</T></T>
            <View style={s.slots}>
              {slots.map((slot, i) => {
                const url = slot ? (slot.kind === 'existing' ? slot.url : slot.uri) : ''
                return (
                  <Pressable key={i} style={[s.slot, slot && s.slotFilled]} disabled={!editing} onPress={() => choose(i)}>
                    {slot ? (
                      <>
                        {!!url && <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />}
                        {i === 0 && <View style={s.badge}><T size={11} weight="semibold" style={{ color: '#fff' }}>Main</T></View>}
                        {editing && <View style={s.editTag}><T size={11} weight="medium" style={{ color: '#fff' }}>Change</T></View>}
                      </>
                    ) : editing ? (
                      <><T size={26} muted>+</T><T size={12} muted>Add photo</T></>
                    ) : (
                      <T size={12} muted>Empty</T>
                    )}
                  </Pressable>
                )
              })}
            </View>
          </Panel>

          {editing ? (
            <Panel>
              <Field label="Name">
                <Input maxLength={50} value={name} onChangeText={setName} editable={!ro} textContentType="givenName" />
              </Field>
              {profile ? (
                <Field label="Age" hint="(from your date of birth)">
                  <Input value={age} editable={false} />
                </Field>
              ) : (
                <Field label="Date of birth" hint="(can’t be changed later)">
                  <DobPicker value={dob} onChange={setDob} />
                  <View style={s.dobAge}><T muted>Your age</T><T weight="semibold">{ageFrom(dob)}</T></View>
                </Field>
              )}
              <Field label="Location">
                <Input maxLength={100} placeholder="City, Country" value={location} onChangeText={setLocation} editable={!ro} />
              </Field>
              <Field label="About me">
                <Input multiline maxLength={1000} value={description} onChangeText={setDescription} editable={!ro} placeholder="A few words about you…" />
              </Field>
            </Panel>
          ) : (
            <Panel>
              <InfoRow label="Name" value={name} />
              <InfoRow label="Age" value={age} />
              <InfoRow label="Location" value={location} />
              <View style={{ paddingTop: 12 }}>
                <T muted size={14}>About me</T>
                <T style={{ marginTop: 4 }}>{description || '—'}</T>
              </View>
            </Panel>
          )}

          <View style={s.private}>
            <View style={s.privateHead}><LockIcon /><T weight="semibold">Private — only you can see this</T></View>
            {editing ? (
              <>
                <Field label="Email"><Input value={email} editable={false} /></Field>
                <Field label="Phone" hint="(optional)">
                  <Input keyboardType="phone-pad" textContentType="telephoneNumber" maxLength={30} value={phone} onChangeText={setPhone} editable={!ro} />
                </Field>
              </>
            ) : (
              <>
                <InfoRow label="Email" value={email} />
                <InfoRow label="Phone (optional)" value={phone || '—'} last />
              </>
            )}
          </View>

          {profile && <NotificationSettingsPanel userId={uid} />}

          {profile && (
            <Panel style={s.freeze}>
              <View style={{ flex: 1 }}>
                <T weight="semibold" size={16}>{status?.frozen ? 'Profile frozen' : 'Freeze profile'}</T>
                <T muted size={14}>{status?.frozen ? 'You’re hidden from Discover. Open chats stay open.' : 'Hide your profile from Discover. Open chats stay open.'}</T>
              </View>
              <Button small kind={status?.frozen ? 'primary' : 'ghost'} title={status?.frozen ? 'Unfreeze' : 'Freeze'} onPress={onToggleFreeze} disabled={freezeBusy} />
            </Panel>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <T muted size={14}>{label}</T>
      <T weight="medium" style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, aspectRatio: 3 / 4, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotFilled: { borderStyle: 'solid', borderColor: colors.border },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  editTag: { position: 'absolute', bottom: 6, alignSelf: 'center', backgroundColor: 'rgba(26,23,25,0.6)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  dobAge: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  private: { backgroundColor: colors.surface2, borderRadius: radius.panel, padding: 20 },
  privateHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  freeze: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
