#!/usr/bin/env python3
"""The rules derive-services.py must not lose, as cases rather than prose.

Every entry here is a real record from a real dry run. The seven that expect
NO tag are mistakes the deriver actually made against the live base on
2026-09-16; the four that expect one are correct calls from the same run that
the fixes had to leave working. Needs no token: derive() is pure.

    python3 scripts/test-derive-services.py
"""
import importlib.util, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("ds", HERE / "derive-services.py")
ds = importlib.util.module_from_spec(spec)
sys.modules["ds"] = ds
spec.loader.exec_module(ds)
F = ds.FLD


def rec(name, track, category="", specific="", ages="", notes=""):
    return {"id": "rec", "fields": {
        F["name"]: name, F["track"]: track, F["category"]: category,
        F["specific"]: specific, F["ages"]: ages, F["notes"]: notes}}


CASES = [
    # --- a name is not a description of services ---
    ("magnet school, name only",
     rec("Cooperative Arts & Humanities Magnet High School", "Teens & High School",
         "Magnet / Specialty School"), "Arts Enrichment", False),
    ("boarding kennel called Day Camp",
     rec("PetSmart PetsHotel & Doggie Day Camp, East Hartford", "Pet Care & Resources",
         "Pet Boarding"), "Summer Day Camp", False),

    # --- a school is not an enrichment provider ---
    ("school fields a team",
     rec("Wilby High School", "Teens & High School", "High School (Public)",
         notes="MCJROTC, school counselors, athletics, and district college support"),
     "Sports Enrichment", False),
    ("school teaches subjects",
     rec("Academy of Information Technology & Engineering", "Teens & High School",
         "Magnet / Specialty School",
         notes="physical sciences, business, fine arts, and information technology"),
     "STEM Enrichment", False),

    # --- youth tags do not cross into the other tracks ---
    ("canine agility is not sport",
     rec("Wag Central", "Pet Care & Resources", "Dog Daycare",
         notes="boarding, grooming, training, swimming, agility enrichment"),
     "Sports Enrichment", False),
    ("bereavement group is not a parenting class",
     rec("Mozaic Jewish Home", "Elder Care", "Skilled Nursing / Rehab",
         notes="dementia care, hospice support, and family support groups"),
     "Parent / Family Support", False),

    # --- writing about a record is not evidence about the service ---
    ("editorial tail",
     rec("Connecticut Paid Leave", "Family & Childcare", "Legal/HR Resource",
         notes="Income replacement.\n\nSource note: verified today. Track and Category "
               "are a judgement call: it serves Elder Care as much as Family & Childcare."),
     "Elder Care", False),

    # --- and the correct calls the fixes had to leave alone ---
    ("respite care is caregiver support",
     rec("Chestelm Health & Rehabilitation Center", "Elder Care", "Skilled Nursing / Rehab",
         notes="24/7 skilled nursing, respite care, memory care"), "Caregiver Support", True),
    ("explicit disability language",
     rec("Partnerships Adult Day Center", "Elder Care", "Adult Day Program",
         ages="adults 18+ with physical or mental disabilities"), "Disability Support", True),
    ("paid internships are youth employment",
     rec("The WorkPlace CareerHub", "Teens & High School", "Job Training Program",
         notes="job search/placement support and paid internship opportunities"),
     "Youth Employment", True),
    ("a real enrichment provider still qualifies",
     rec("Brooklyn Robot Foundry - Coastal CT", "Family & Childcare", "Afterschool Enrichment",
         notes="Fall 2026 robotics and coding enrichment"), "STEM Enrichment", True),
]


def main():
    fails = 0
    for label, record, tag, want in CASES:
        tags, _ = ds.derive(record)
        got = tag in tags
        if got != want:
            fails += 1
            print(f"FAIL  {label}: {tag} {'was added' if got else 'was not added'}, "
                  f"expected {'it' if want else 'not to be'}")
    if fails:
        print(f"\n{fails} of {len(CASES)} derive-services rules are broken.")
        return 1
    print(f"derive-services rules hold: {len(CASES)} cases.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
