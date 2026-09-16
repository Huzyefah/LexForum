"""Explicitly fictional fixture. Never used to answer a user-submitted case."""

import asyncio
import hashlib
from uuid import uuid4

from .models import *

SAMPLE_SCENARIO = """This is a fictional teaching case. On 10 January 2026, Mehr Design Studio in Lahore agreed to supply a website to Ravi Retail for PKR 450,000. The client paid PKR 150,000 upfront. The agreement required delivery by 28 February and payment of the balance upon written acceptance. Mehr sent a delivery email on 25 February requesting acceptance. Ravi replied on 2 March that mobile checkout and inventory synchronization were incomplete. Mehr says these were later additions; Ravi says they were promised before signing. The client began using the site on 5 March but has withheld the PKR 300,000 balance. The studio seeks the balance and the client seeks correction of defects or a price reduction. No signed acceptance, original email headers, pre-contract messages or independent technical inspection have been supplied."""


def sample_case() -> Case:
    documents = [
        (
            "E1",
            "Service agreement · 10 Jan 2026",
            "Contract",
            "Neutral",
            "FICTIONAL SAMPLE. Mehr Design Studio and Ravi Retail agree on a PKR 450,000 website project. Advance: PKR 150,000. Balance payable upon written acceptance. Delivery: 28 February 2026. Scope: catalogue, cart and standard checkout. Changes require written agreement. Signatures are represented only by typed names in this sample.",
        ),
        (
            "E2",
            "Delivery and defect email thread",
            "Correspondence",
            "Plaintiff",
            "FICTIONAL SAMPLE. 25 February: Mehr Design Studio: The website is delivered. Please confirm acceptance and pay PKR 300,000. 2 March: Ravi Retail: Mobile checkout fails and inventory is not synchronized. We cannot accept this delivery. 3 March: Mehr: Inventory sync was an additional request, not agreed scope. Please provide reproduction steps for checkout.",
        ),
        (
            "E3",
            "Advance payment record",
            "Financial record",
            "Neutral",
            "FICTIONAL SAMPLE. 12 January 2026. Ravi Retail paid Mehr Design Studio PKR 150,000 as website advance. This is a sample transaction transcription, not an authenticated bank statement. No final balance payment is shown.",
        ),
    ]
    return Case(
        id=str(uuid4()),
        title="Mehr Design Studio v. Ravi Retail",
        scenario=SAMPLE_SCENARIO,
        province=Province.punjab,
        category="Contract",
        plaintiff="Mehr Design Studio",
        defendant="Ravi Retail",
        remedy="Recovery of PKR 300,000, subject to proof of contractual performance and any valid set-off.",
        created_at=now(),
        updated_at=now(),
        is_sample=True,
        evidence=[
            Evidence(
                id=i,
                title=t,
                kind=k,
                submitted_by=p,
                text=x,
                created_at=now(),
                sha256=hashlib.sha256(x.encode()).hexdigest(),
            )
            for i, t, k, p, x in documents
        ],
    )


class DemoProvider:
    async def research(self, query, province):
        await asyncio.sleep(0.12)
        return Research(
            summary="Demonstration fixture: contractual scope, acceptance, alleged defects and proof of loss need legal research. The Contract Act, 1872 is a starting point to investigate. No live search was performed and no precedent or statutory proposition is asserted as verified.",
            sources=[
                Source(
                    id="S1",
                    title="Pakistan Code · official legislation portal",
                    url="https://pakistancode.gov.pk/",
                    status="Unverified reference",
                    kind="Legislation",
                    excerpt="Official research starting point only. No provision was retrieved or verified in this demonstration.",
                )
            ],
            warnings=[
                "Offline demonstration. Sources and legal applicability have not been researched. Do not use this fixture as legal advice."
            ],
        )

    async def structured(self, role, task, context, schema):
        await asyncio.sleep(0.12)
        if schema is StructuredCase:
            return StructuredCase(
                summary="A Lahore design studio seeks an unpaid PKR 300,000 balance. The client disputes completion and acceptance, alleging checkout defects and missing inventory integration. The central questions are agreed scope, performance and the payment trigger.",
                legal_issues=[
                    "Whether the delivered site met the agreed contractual scope",
                    "Whether written acceptance occurred or the parties varied that requirement",
                    "Whether defects or an agreed change justify withholding payment or a set-off",
                ],
                claims=[
                    Claim(
                        id="C1",
                        description="PKR 300,000 remains payable for completed work.",
                        party="Plaintiff",
                        evidence_ids=["E1", "E2", "E3"],
                    ),
                    Claim(
                        id="C2",
                        description="Delivery was incomplete and the payment condition was not satisfied.",
                        party="Defense",
                        evidence_ids=["E1", "E2"],
                    ),
                ],
                chronology=[
                    "10 Jan 2026 · Service agreement",
                    "12 Jan 2026 · PKR 150,000 advance",
                    "25 Feb 2026 · Delivery email",
                    "02 Mar 2026 · Defects raised",
                    "05 Mar 2026 · Site use alleged, not evidenced",
                ],
                missing_facts=[
                    "Signed acceptance or evidence of waiver",
                    "Pre-contract scope discussions",
                    "Technical inspection of checkout defects",
                ],
                research_query="Pakistan Punjab service contract payment written acceptance defective performance scope variation remedies",
            )
        if schema is EvidenceAnalysis:
            return EvidenceAnalysis(
                completeness="Partial",
                contradictions=[
                    "The parties disagree whether inventory synchronization was included. The written scope and earlier communications must be compared."
                ],
                gaps=[
                    "Original signed agreement",
                    "Written acceptance or waiver",
                    "Independent technical inspection",
                    "Original email headers and complete thread",
                ],
                findings=[
                    EvidenceFinding(
                        evidence_id="E1",
                        relevance="High",
                        supports=["C1: price and balance", "C2: written acceptance condition"],
                        challenges=["C1: payment is conditional"],
                        contradictions=[],
                        limitations=["Typed sample names cannot authenticate execution."],
                        assessment="Defines the payment trigger and scope; does not establish completion.",
                    ),
                    EvidenceFinding(
                        evidence_id="E2",
                        relevance="High",
                        supports=["C1: delivery was asserted", "C2: defects were raised"],
                        challenges=["C1: acceptance remains disputed"],
                        contradictions=["Inventory scope is disputed."],
                        limitations=["Incomplete thread; no original headers or attachments."],
                        assessment="Shows competing accounts. A delivery email is not proof that the site functioned correctly.",
                    ),
                    EvidenceFinding(
                        evidence_id="E3",
                        relevance="Medium",
                        supports=["C1: advance payment consistent with the agreement"],
                        challenges=[],
                        contradictions=[],
                        limitations=["Transcription only; not an authenticated bank statement."],
                        assessment="Supports an existing commercial relationship, not completion or the balance becoming due.",
                    ),
                ],
            )
        if schema is Submission:
            plaintiff = role.startswith("Plaintiff")
            second = bool(context["previous_rounds"])
            if plaintiff:
                return Submission(
                    thesis="The studio has a documented agreement and delivery record, but recovery of the balance depends on proving performance and the payment trigger.",
                    arguments=[
                        Argument(
                            title="Agreed price and recorded delivery",
                            position="The agreement and payment record support a PKR 450,000 engagement. The delivery email supports tender of work, although it does not prove conformity.",
                            evidence_ids=["E1", "E2", "E3"],
                            source_ids=[],
                            strength="Moderate",
                            vulnerability="No written acceptance has been produced.",
                        ),
                        Argument(
                            title="Inventory integration may be additional scope",
                            position="The written scope mentions standard checkout but does not expressly describe inventory synchronization. Earlier negotiations could change the analysis.",
                            evidence_ids=["E1", "E2"],
                            source_ids=[],
                            strength="Moderate",
                            vulnerability="The complete pre-contract correspondence is missing.",
                        ),
                    ],
                    rebuttals=[
                        "Use of the site may be relevant conduct, but the record does not prove use or waiver. Obtain logs and acceptance communications."
                    ]
                    if second
                    else [],
                    concessions=[
                        "The checkout defect needs technical verification.",
                        "The record does not prove written acceptance.",
                    ],
                )
            return Submission(
                thesis="The agreement ties the balance to written acceptance. The client can contest that trigger and demand proof of conforming performance.",
                arguments=[
                    Argument(
                        title="Acceptance remains unproven",
                        position="The payment condition is documented and no acceptance is supplied. The client’s defect email is inconsistent with unconditional acceptance.",
                        evidence_ids=["E1", "E2"],
                        source_ids=[],
                        strength="Strong",
                        vulnerability="Later conduct or other correspondence may show acceptance or variation.",
                    ),
                    Argument(
                        title="Defects could affect the value of performance",
                        position="The client reported a checkout problem. This needs independent testing and proof of any loss before justifying an amount withheld.",
                        evidence_ids=["E2"],
                        source_ids=[],
                        strength="Moderate",
                        vulnerability="A reported fault does not establish severity, cause, or quantified loss.",
                    ),
                ],
                rebuttals=[
                    "The advance payment establishes the engagement, not satisfactory final performance.",
                    "Inventory scope remains uncertain; prioritize the expressly included checkout functionality.",
                ]
                if second
                else [],
                concessions=[
                    "The current record does not prove inventory integration was contracted.",
                    "No quantified rectification cost or loss is supplied.",
                ],
            )
        if schema is JudicialReview:
            second = "round 2" in task
            return JudicialReview(
                assessment=(
                    "The rebuttal round narrows the dispute to the acceptance condition and demonstrable checkout defects. Neither side supplied new evidence, so the main factual gaps remain."
                    if second
                    else "The plaintiff has support for an engagement and asserted delivery. The defense has a concrete contractual acceptance objection. No binding outcome can be reached on these sample documents."
                ),
                plaintiff_strength="Moderate",
                defense_strength="Moderate",
                source_ids=[],
                key_disputes=[
                    "Acceptance or waiver",
                    "Conformity of checkout functionality",
                    "Agreed scope of inventory integration",
                ],
                questions_for_next_round=[]
                if second
                else [
                    "What proves written acceptance or waiver?",
                    "What independent test supports or rebuts the checkout defect?",
                    "Which communication defines inventory scope?",
                ],
            )
        if schema is Report:
            return Report(
                executive_summary="The fictional record supports the existence of a contract and an outstanding claimed balance, but not an unconditional right to immediate payment. Acceptance, functional performance and scope remain disputed. The two rounds narrow the factual questions; they do not resolve them.",
                overall_risk="High",
                confidence="Low",
                confidence_reason="This offline fixture uses three synthetic documents, no authenticated originals and no verified legal authorities. The labels illustrate workflow behavior only.",
                plaintiff_strength="Moderate",
                defense_strength="Moderate",
                applicable_law=[],
                precedents=[],
                risks=[
                    Risk(
                        title="Payment trigger not established",
                        severity="High",
                        explanation="The agreement requires written acceptance and none is supplied.",
                        mitigation="Locate signed acceptance, subsequent communications and evidence of any agreed variation.",
                    ),
                    Risk(
                        title="Technical defects remain disputed",
                        severity="High",
                        explanation="Neither party supplied a reproducible technical assessment.",
                        mitigation="Commission a dated, independent test with reproducible steps.",
                    ),
                    Risk(
                        title="Scope and loss are incomplete",
                        severity="Medium",
                        explanation="Earlier scope discussions and quantified rectification costs are missing.",
                        mitigation="Preserve negotiations and obtain itemized remediation estimates.",
                    ),
                ],
                evidence_gaps=[
                    "Written acceptance or waiver",
                    "Original agreement and full correspondence",
                    "Independent technical assessment",
                    "Proof and amount of loss",
                    "Evidence of alleged site use",
                ],
                next_steps=[
                    "Preserve the original agreement, emails, attachments and transaction records.",
                    "Create a joint scope checklist and independent defect report.",
                    "Ask a Pakistan-qualified advocate to verify applicable provisions, case law, forum and limitation periods.",
                    "Consider a documented cure and payment proposal after the factual gaps are addressed.",
                ],
                limitations=[
                    "DEMONSTRATION ONLY: fixed synthetic analysis; no AI calls or live research.",
                    "No applicable provision or precedent has been verified.",
                    "Qualitative strength and confidence are illustrative, not outcome probabilities.",
                ],
            )
        raise ValueError("Unsupported demo schema")
