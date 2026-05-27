export const BOOK_LANGUAGE = 'английском'

export const PARAGRAPHS = [
  "On a quiet Sunday morning, Emma left her small apartment and walked toward the park. The streets were still empty, and the air smelled faintly of rain from the night before.",
  "She carried a paperback novel in her coat pocket and a thermos of tea in her hand. Reading outdoors had become her favorite ritual whenever the weather allowed it.",
  "At the park gate, an old man was feeding pigeons near a bench. He nodded politely as she passed, and she smiled back without breaking her stride.",
  "Emma found a sunny spot beneath a maple tree and sat down. She opened her book, took a sip of tea, and let the first sentence pull her gently into another world.",
  "Time moved differently when she read. The distant sound of bicycles and children playing became a soft background, like music she did not need to follow.",
  "When the sun climbed higher, she closed the book and looked up at the green canopy above. The walk home would be short, but the story would stay with her all day.",
];

export const BOOKS: Record<string, { title: string; author: string; paragraphs: string[] }> = {
  "morning-walk": {
    title: "The Morning Walk",
    author: "Sample Author",
    paragraphs: PARAGRAPHS,
  },
};
