"""Auto-registry of all 42 NeuronGuard agents."""
from typing import Type
from core.agent_base import NeuronGuardAgent

# Expert agents (AG-01 … AG-30)
from agents.vuln_analysis import VulnAnalysisAgent
from agents.pentest_web import PentestWebAgent
from agents.pentest_network import PentestNetworkAgent
from agents.api_security import ApiSecurityAgent
from agents.hardening import HardeningAgent
from agents.soc_blueteam import SocBlueteamAgent
from agents.incident_response import IncidentResponseAgent
from agents.malware_analysis import MalwareAnalysisAgent
from agents.threat_intel import ThreatIntelAgent
from agents.osint import OsintAgent
from agents.cloud_security import CloudSecurityAgent
from agents.devsecops import DevSecOpsAgent
from agents.code_security import CodeSecurityAgent
from agents.db_security import DbSecurityAgent
from agents.iam import IamAgent
from agents.phishing import PhishingAgent
from agents.email_security import EmailSecurityAgent
from agents.compliance import ComplianceAgent
from agents.risk_management import RiskManagementAgent
from agents.endpoint_security import EndpointSecurityAgent
from agents.mobile_security import MobileSecurityAgent
from agents.iot_security import IotSecurityAgent
from agents.forensics import ForensicsAgent
from agents.backup_recovery import BackupRecoveryAgent
from agents.ransomware_defense import RansomwareDefenseAgent
from agents.cms_security import CmsSecurityAgent
from agents.container_security import ContainerSecurityAgent
from agents.security_architecture import SecurityArchitectureAgent
from agents.data_privacy import DataPrivacyAgent
from agents.executive_report import ExecutiveReportAgent

# Teacher agents (DOC-01 … DOC-12)
from agents.teach_fundamentals import TeachFundamentalsAgent
from agents.teach_networks import TeachNetworksAgent
from agents.teach_linux import TeachLinuxAgent
from agents.teach_ethical_hacking import TeachEthicalHackingAgent
from agents.teach_web_security import TeachWebSecurityAgent
from agents.teach_blueteam import TeachBlueteamAgent
from agents.teach_malware import TeachMalwareAgent
from agents.teach_osint import TeachOsintAgent
from agents.teach_cloud import TeachCloudAgent
from agents.teach_devsecops import TeachDevSecOpsAgent
from agents.teach_compliance import TeachComplianceAgent
from agents.teach_evaluator import TeachEvaluatorAgent

_ALL_AGENTS: list[Type[NeuronGuardAgent]] = [
    # Expert
    VulnAnalysisAgent, PentestWebAgent, PentestNetworkAgent, ApiSecurityAgent,
    HardeningAgent, SocBlueteamAgent, IncidentResponseAgent, MalwareAnalysisAgent,
    ThreatIntelAgent, OsintAgent, CloudSecurityAgent, DevSecOpsAgent,
    CodeSecurityAgent, DbSecurityAgent, IamAgent, PhishingAgent,
    EmailSecurityAgent, ComplianceAgent, RiskManagementAgent, EndpointSecurityAgent,
    MobileSecurityAgent, IotSecurityAgent, ForensicsAgent, BackupRecoveryAgent,
    RansomwareDefenseAgent, CmsSecurityAgent, ContainerSecurityAgent,
    SecurityArchitectureAgent, DataPrivacyAgent, ExecutiveReportAgent,
    # Teacher
    TeachFundamentalsAgent, TeachNetworksAgent, TeachLinuxAgent,
    TeachEthicalHackingAgent, TeachWebSecurityAgent, TeachBlueteamAgent,
    TeachMalwareAgent, TeachOsintAgent, TeachCloudAgent,
    TeachDevSecOpsAgent, TeachComplianceAgent, TeachEvaluatorAgent,
]

AGENT_REGISTRY: dict[str, Type[NeuronGuardAgent]] = {
    cls.slug: cls for cls in _ALL_AGENTS
}
