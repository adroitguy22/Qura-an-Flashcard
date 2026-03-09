import re

def break_into_syllables(word):
    """
    Breaks an Arabic word into syllables or readable chunks.
    This is a simplified heuristic. It groups consonants with their following vowels (harakat).
    """
    # Arabic letters: \u0621-\u064A
    # Arabic Harakat (Vowels, Shadda, Sukun): \u064B-\u065F, \u0670
    
    # We will split the word such that each chunk contains at least one base letter,
    # capturing the marks that follow it.
    
    chunks = []
    current_chunk = ""
    
    # A simple approach: 
    # Iterate through characters. 
    # If a character is a base letter (not a diacritic), and we already have letters in chunk,
    # it might be the start of a new syllable unless the previous letter had a sukun (which connects them).
    # Since accurate arabic syllabification is complex, we'll use a basic grouping:
    # We group (Consonant + Vowel/Diacritics).
    # If there's an Alif sequence (like ال), we might want to keep it together, but for now we do simple splits.
    
    # Regex logic: Match one base letter (or Hamza) followed by any diacritics.
    # Standard Arabic diacritics: \u064B-\u065F
    # Small Alif: \u0670
    # Quranic marks (including Uthmani Sukun \u06E1): \u06D6-\u06ED
    pattern = r'[\u0621-\u064A\u0671-\u06D3\u06D5][\u064B-\u065F\u0670\u06D6-\u06ED]*'
    matches = re.finditer(pattern, word)
    
    syllables = []
    temp_syllable = ""
    
    for match in matches:
        part = match.group()
        # If the part has a Sukun (\u0652) or Shadda (\u0651), it often connects to the previous or next letter.
        # For a basic "slow reading" flashcard, showing letter-by-letter (with its vowel) is often exactly what is needed,
        # but joining Sukun/Shadda with the previous letter is better.
        
        # We will build a simple rule:
        # If the current part has a Sukun, append it to the temp_syllable and commit.
        # If there's a Shadda, we might just treat it as its own syllable for the flashcard.
        
        # Actually, for slow learners, chunking byte-by-byte (letter+vowel) is very effective.
        # So we just treat each (letter + diacritics) as a syllable, EXCEPT:
        # 1. Alif Lam (ال) usually goes together.
        
        if len(syllables) == 0 and temp_syllable == "" and part.startswith('\u0627'): # Alif
            temp_syllable = part
        elif temp_syllable.startswith('\u0627') and part.startswith('\u0644'): # Lam
            syllables.append(temp_syllable + part)
            temp_syllable = ""
        else:
            if temp_syllable:
                syllables.append(temp_syllable)
                temp_syllable = ""
                
            # If the current part has a sukun (\u0652 or \u06E1) or shadda (\u0651),
            # it should attach to the PREVIOUS syllable if possible, creating a joined sound.
            # ALSO attach Madd letters: Alif (\u0627), Waw (\u0648), Yaa (\u064A), Alif Maksura (\u0649) 
            # if they have NO diacritics (len == 1) or have a Maddah (\u0653) or small Alif (\u0670).
            is_sukun_or_shadda = '\u0652' in part or '\u06E1' in part or '\u0651' in part
            is_madd = (len(part) == 1 and part in ['\u0627', '\u0648', '\u064A', '\u0649', '\u06CC']) or '\u0653' in part or '\u0670' in part
            
            if (is_sukun_or_shadda or is_madd) and len(syllables) > 0:
                syllables[-1] += part
            else:
                syllables.append(part)
                
    if temp_syllable:
        if len(syllables) > 0:
            syllables[-1] += temp_syllable
        else:
            syllables.append(temp_syllable)
        
    # If regex missed anything (like non-arabic chars), just fallback to returning the whole word as one syllable
    if not syllables:
        return [word]
        
    return syllables
