import { describe, it, expect } from 'vitest';
import { parseByline, parseSupportMessage } from '../src/messages';

describe('[MSG] widget parsing rule ^([^:\\n]{1,40}): ', () => {
  it('[MSG1] takes the name and the rest as body', () => {
    expect(parseByline('Alice: Hello')).toEqual({ author: 'Alice', text: 'Hello' });
    expect(parseByline('Jean-Luc Picard: a: b')).toEqual({ author: 'Jean-Luc Picard', text: 'a: b' });
  });

  it('[MSG2] no byline when the name is over 40 chars, holds a newline, lacks the space, or is blank', () => {
    const long = 'x'.repeat(41);
    expect(parseByline(`${long}: hi`)).toEqual({ author: null, text: `${long}: hi` });
    expect(parseByline('a\nb: hi').author).toBeNull();
    expect(parseByline('Alice:hi').author).toBeNull();
    expect(parseByline('   : hi').author).toBeNull();
    expect(parseByline('Hello there').author).toBeNull();
  });

  it('[MSG3] 40 chars is still a byline', () => {
    const name = 'y'.repeat(40);
    expect(parseByline(`${name}: ok`)).toEqual({ author: name, text: 'ok' });
  });

  it('[MSG4] the "joined" line of the relay has no byline and renders as the team', () => {
    expect(parseByline('Alice from the HDS team has joined the conversation').author).toBeNull();
  });

  it('[MSG5] parseSupportMessage drops non-chat, trashed and empty events', () => {
    expect(parseSupportMessage({ id: 'a', time: 1, type: 'note/txt', content: 'x' })).toBeNull();
    expect(parseSupportMessage({ id: 'a', time: 1, type: 'message/chat-cmc', trashed: true, content: { content: 'x' } })).toBeNull();
    expect(parseSupportMessage({ id: 'a', time: 1, type: 'message/chat-cmc', content: { content: '  ' } })).toBeNull();
    expect(parseSupportMessage(null)).toBeNull();
  });
});
