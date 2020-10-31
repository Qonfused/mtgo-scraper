import { database as db } from 'firebase-admin'

const database = {
  async fetch(ref: string) {
    const value = await db()
      .ref(ref)
      .once('value')
      .then(snap => snap.val())

    return value
  },
  async push(ref: string, props: any) {
    const id: string = await db()
      .ref(ref)
      .push(props)
      .then(({ key }) => key)

    await db()
      .ref(`${ref}/${id}`)
      .update({ id })

    const value = await db()
      .ref(`${ref}/${id}`)
      .once('value')
      .then(snap => snap.val())

    return value
  },
  async update(ref: string, props: any) {
    await db()
      .ref(ref)
      .update(props)

    const value = await db()
      .ref(ref)
      .once('value')
      .then(snap => snap.val())

    return value
  },
  async set(ref: string, props: any) {
    await db()
      .ref(ref)
      .set(props)

    const value = await db()
      .ref(ref)
      .once('value')
      .then(snap => snap.val())

    return value
  },
  async delete(ref: string) {
    const value = await db()
      .ref(ref)
      .once('value')
      .then(snap => snap.val())

    await db()
      .ref(ref)
      .remove()

    return value
  },
}

export default database
