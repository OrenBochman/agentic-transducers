# ktb_paradigm_fst.py
# -*- coding: utf-8 -*-

from __future__ import annotations

import unicodedata
from typing import Iterable

import pynini


ROOT = "כ-ת-ב"
LEMMA = "כתב"

BINYANIM = [
    "Paal",
    "Nifal",
    "Piel",
    "Pual",
    "Hifil",
    "Hufal",
    "Hitpael",
]


def norm(s: str) -> str:
    """Normalize Hebrew combining marks into canonical order."""
    return unicodedata.normalize("NFC", s)


def finite_analysis(
    binyan: str,
    tense: str,
    person: str,
    number: str,
    gender: str,
) -> str:
    return "|".join(
        [
            f"lemma={LEMMA}",
            f"root={ROOT}",
            "pos=VERB",
            f"binyan={binyan}",
            "form=finite",
            f"tense={tense}",
            f"person={person}",
            f"number={number}",
            f"gender={gender}",
        ]
    )


def nonfinite_analysis(
    binyan: str,
    form: str,
    *,
    person: str = "None",
    number: str = "None",
    gender: str = "None",
) -> str:
    pos = "VERBAL_NOUN" if form == "verbal_noun" else "VERB"
    return "|".join(
        [
            f"lemma={LEMMA}",
            f"root={ROOT}",
            f"pos={pos}",
            f"binyan={binyan}",
            f"form={form}",
            "tense=None",
            f"person={person}",
            f"number={number}",
            f"gender={gender}",
        ]
    )


FINITE_ROWS = [
    # Present
    ("Present", "None", "Singular", "Masculine",
     ["כּוֹתֵב", "נִכְתָּב", "מְכַתֵּב", "מְכֻתָּב", "מַכְתִּיב", "מֻכְתָּב", "מִתְכַּתֵּב"]),
    ("Present", "None", "Singular", "Feminine",
     ["כּוֹתֶבֶת", "נִכְתֶּבֶת", "מְכַתֶּבֶת", "מְכֻתֶּבֶת", "מַכְתִּיבָה", "מֻכְתֶּבֶת", "מִתְכַּתֶּבֶת"]),
    ("Present", "None", "Plural", "Masculine",
     ["כּוֹתְבִים", "נִכְתָּבִים", "מְכַתְּבִים", "מְכֻתָּבִים", "מַכְתִּיבִים", "מֻכְתָּבִים", "מִתְכַּתְּבִים"]),
    ("Present", "None", "Plural", "Feminine",
     ["כּוֹתְבוֹת", "נִכְתָּבוֹת", "מְכַתְּבוֹת", "מְכֻתָּבוֹת", "מַכְתִּיבוֹת", "מֻכְתָּבוֹת", "מִתְכַּתְּבוֹת"]),

    # Past
    ("Past", "1", "Singular", "Common",
     ["כָּתַבְתִּי", "נִכְתַּבְתִּי", "כִּתַּבְתִּי", "כֻּתַּבְתִּי", "הִכְתַּבְתִּי", "הֻכְתַּבְתִּי", "הִתְכַּתַּבְתִּי"]),
    ("Past", "2", "Singular", "Masculine",
     ["כָּתַבְתָּ", "נִכְתַּבְתָּ", "כִּתַּבְתָּ", "כֻּתַּבְתָּ", "הִכְתַּבְתָּ", "הֻכְתַּבְתָּ", "הִתְכַּתַּבְתָּ"]),
    ("Past", "2", "Singular", "Feminine",
     ["כָּתַבְתְּ", "נִכְתַּבְתְּ", "כִּתַּבְתְּ", "כֻּתַּבְתְּ", "הִכְתַּבְתְּ", "הֻכְתַּבְתְּ", "הִתְכַּתַּבְתְּ"]),
    ("Past", "3", "Singular", "Masculine",
     ["כָּתַב", "נִכְתַּב", "כִּתֵּב", "כֻּתַּב", "הִכְתִּיב", "הֻכְתַּב", "הִתְכַּתֵּב"]),
    ("Past", "3", "Singular", "Feminine",
     ["כָּתְבָה", "נִכְתְּבָה", "כִּתְּבָה", "כֻּתְּבָה", "הִכְתִּיבָה", "הֻכְתְּבָה", "הִתְכַּתְּבָה"]),
    ("Past", "1", "Plural", "Common",
     ["כָּתַבְנוּ", "נִכְתַּבְנוּ", "כִּתַּבְנוּ", "כֻּתַּבְנוּ", "הִכְתַּבְנוּ", "הֻכְתַּבְנוּ", "הִתְכַּתַּבְנוּ"]),
    ("Past", "2", "Plural", "Masculine",
     ["כְּתַבְתֶּם", "נִכְתַּבְתֶּם", "כִּתַּבְתֶּם", "כֻּתַּבְתֶּם", "הִכְתַּבְתֶּם", "הֻכְתַּבְתֶּם", "הִתְכַּתַּבְתֶּם"]),
    ("Past", "2", "Plural", "Feminine",
     ["כְּתַבְתֶּן", "נִכְתַּבְתֶּן", "כִּתַּבְתֶּן", "כֻּתַּבְתֶּן", "הִכְתַּבְתֶּן", "הֻכְתַּבְתֶּן", "הִתְכַּתַּבְתֶּן"]),
    ("Past", "3", "Plural", "Common",
     ["כָּתְבוּ", "נִכְתְּבוּ", "כִּתְּבוּ", "כֻּתְּבוּ", "הִכְתִּיבוּ", "הֻכְתְּבוּ", "הִתְכַּתְּבוּ"]),

    # Future
    ("Future", "1", "Singular", "Common",
     ["אֶכְתֹּב", "אֶכָּתֵב", "אֲכַתֵּב", "אֲכֻתַּב", "אַכְתִּיב", "אֻכְתַּב", "אֶתְכַּתֵּב"]),
    ("Future", "1", "Plural", "Common",
     ["נִכְתֹּב", "נִכָּתֵב", "נְכַתֵּב", "נְכֻתַּב", "נַכְתִּיב", "נֻכְתַּב", "נִתְכַּתֵּב"]),
    ("Future", "2", "Singular", "Masculine",
     ["תִּכְתֹּב", "תִּכָּתֵב", "תְּכַתֵּב", "תְּכֻתַּב", "תַּכְתִּיב", "תֻּכְתַּב", "תִּתְכַּתֵּב"]),
    ("Future", "2", "Singular", "Feminine",
     ["תִּכְתְּבִי", "תִּכָּתְבִי", "תְּכַתְּבִי", "תְּכֻתְּבִי", "תַּכְתִּיבִי", "תֻּכְתְּבִי", "תִּתְכַּתְּבִי"]),
    ("Future", "2", "Plural", "Masculine",
     ["תִּכְתְּבוּ", "תִּכָּתְבוּ", "תְּכַתְּבוּ", "תְּכֻתְּבוּ", "תַּכְתִּיבוּ", "תֻּכְתְּבוּ", "תִּתְכַּתְּבוּ"]),
    ("Future", "2", "Plural", "Feminine",
     ["תִּכְתֹּבְנָה", "תִּכָּתֵבְנָה", "תְּכַתֵּבְנָה", "תְּכֻתַּבְנָה", "תַּכְתֵּבְנָה", "תֻּכְתַּבְנָה", "תִּתְכַּתֵּבְנָה"]),
    ("Future", "3", "Singular", "Masculine",
     ["יִכְתֹּב", "יִכָּתֵב", "יְכַתֵּב", "יְכֻתַּב", "יַכְתִּיב", "יֻכְתַּב", "יִתְכַּתֵּב"]),
    ("Future", "3", "Singular", "Feminine",
     ["תִּכְתֹּב", "תִּכָּתֵב", "תְּכַתֵּב", "תְּכֻתַּב", "תַּכְתִּיב", "תֻּכְתַּב", "תִּתְכַּתֵּב"]),
    ("Future", "3", "Plural", "Masculine",
     ["יִכְתְּבוּ", "יִכָּתְבוּ", "יְכַתְּבוּ", "יְכֻתְּבוּ", "יַכְתִּיבוּ", "יֻכְתְּבוּ", "יִתְכַּתְּבוּ"]),
    ("Future", "3", "Plural", "Feminine",
     ["תִּכְתֹּבְנָה", "תִּכָּתֵבְנָה", "תְּכַתֵּבְנָה", "תְּכֻתַּבְנָה", "תַּכְתֵּבְנָה", "תֻּכְתַּבְנָה", "תִּתְכַּתֵּבְנָה"]),
]


NONFINITE_ROWS = [
    ("Paal",    "infinitive",  "לִכְתֹּב"),
    ("Paal",    "imperative",  "כְּתֹב"),
    ("Paal",    "verbal_noun", "כְּתִיבָה"),

    ("Nifal",   "infinitive",  "לְהִכָּתֵב"),
    ("Nifal",   "imperative",  "הִכָּתֵב"),
    ("Nifal",   "verbal_noun", "הִכָּתְבוּת"),

    ("Piel",    "infinitive",  "לְכַתֵּב"),
    ("Piel",    "imperative",  "כַּתֵּב"),
    ("Piel",    "verbal_noun", "כִּתּוּב"),

    # Pu'al has no productive infinitive / imperative / verbal noun here.

    ("Hifil",   "infinitive",  "לְהַכְתִּיב"),
    ("Hifil",   "imperative",  "הַכְתֵּב"),
    ("Hifil",   "verbal_noun", "הַכְתָּבָה"),

    ("Hufal",   "infinitive",  "לְהֻכְתַּב"),

    ("Hitpael", "infinitive",  "לְהִתְכַּתֵּב"),
    ("Hitpael", "imperative",  "הִתְכַּתֵּב"),
    ("Hitpael", "verbal_noun", "הִתְכַּתְּבוּת"),
]


def paradigm_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []

    for tense, person, number, gender, surfaces in FINITE_ROWS:
        for binyan, surface in zip(BINYANIM, surfaces):
            pairs.append(
                (
                    norm(surface),
                    finite_analysis(
                        binyan=binyan,
                        tense=tense,
                        person=person,
                        number=number,
                        gender=gender,
                    ),
                )
            )

    for binyan, form, surface in NONFINITE_ROWS:
        if form == "imperative":
            analysis = nonfinite_analysis(
                binyan,
                form,
                person="2",
                number="Singular",
                gender="Masculine",
            )
        else:
            analysis = nonfinite_analysis(binyan, form)

        pairs.append((norm(surface), analysis))

    return pairs


def build_transducer(pairs: Iterable[tuple[str, str]]) -> pynini.Fst:
    return pynini.union(
        *[pynini.cross(surface, analysis) for surface, analysis in pairs]
    ).optimize()


SURFACE_TO_ANALYSIS = build_transducer(paradigm_pairs())
ANALYSIS_TO_SURFACE = pynini.invert(SURFACE_TO_ANALYSIS).optimize()


def transduce(s: str, fst: pynini.Fst) -> list[str]:
    lattice = pynini.compose(norm(s), fst)

    if lattice.start() == pynini.NO_STATE_ID:
        return []

    return sorted(set(lattice.paths().ostrings()))


def analyze(surface: str) -> list[str]:
    """Surface Hebrew form -> one or more morphological analyses."""
    return transduce(surface, SURFACE_TO_ANALYSIS)


def generate(analysis: str) -> list[str]:
    """Morphological analysis -> surface Hebrew form."""
    return transduce(analysis, ANALYSIS_TO_SURFACE)


if __name__ == "__main__":
    examples = [
        "כּוֹתֵב",
        "תִּכְתֹּב",
        "הִתְכַּתֵּב",
        "כְּתִיבָה",
        "לְהַכְתִּיב",
    ]

    for surface in examples:
        print(f"\n{surface}")
        for analysis in analyze(surface):
            print("  ->", analysis)

    print("\nGenerate example:")
    a = finite_analysis(
        binyan="Hitpael",
        tense="Future",
        person="3",
        number="Plural",
        gender="Masculine",
    )
    print(a)
    print("  ->", generate(a))