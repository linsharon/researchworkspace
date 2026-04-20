import { useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PAYPAL_CONTAINER_ID = "paypal-button-container-P-5B02189379420942WNHSA4GA";
const PAYPAL_SCRIPT_ID = "paypal-subscription-sdk";
const PAYPAL_PLAN_ID = "P-5B02189379420942WNHSA4GA";
const PAYPAL_SDK_URL =
  "https://www.paypal.com/sdk/js?client-id=AX7oDkq_QLZ5uDOs0XvyFuoz6EP6cITjxgvMnfTegQU49zZyQuhIycQIRE9AMPftMDs8dJvdXju3okBU&vault=true&intent=subscription";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: {
          shape?: string;
          color?: string;
          layout?: string;
          label?: string;
        };
        createSubscription?: (data: unknown, actions: { subscription: { create: (params: { plan_id: string }) => string } }) => string;
        onApprove?: (data: { subscriptionID?: string }) => void;
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

export default function PremiumPlans() {
  const { lang } = useI18n();
  const isZh = lang === "zh";

  useEffect(() => {
    const renderPaypalButtons = () => {
      if (!window.paypal) return;
      const target = document.getElementById(PAYPAL_CONTAINER_ID);
      if (!target) return;
      target.innerHTML = "";

      void window.paypal
        .Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: (_data, actions) => {
            return actions.subscription.create({
              plan_id: PAYPAL_PLAN_ID,
            });
          },
          onApprove: (data) => {
            const subscriptionId = data.subscriptionID || "";
            if (subscriptionId) {
              window.alert(
                isZh
                  ? `订阅成功，Subscription ID: ${subscriptionId}`
                  : `Subscription approved: ${subscriptionId}`
              );
            }
          },
        })
        .render(`#${PAYPAL_CONTAINER_ID}`);
    };

    if (window.paypal) {
      renderPaypalButtons();
      return;
    }

    const existingScript = document.getElementById(PAYPAL_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", renderPaypalButtons);
      return () => existingScript.removeEventListener("load", renderPaypalButtons);
    }

    const script = document.createElement("script");
    script.id = PAYPAL_SCRIPT_ID;
    script.src = PAYPAL_SDK_URL;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.async = true;
    script.addEventListener("load", renderPaypalButtons);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", renderPaypalButtons);
    };
  }, [isZh]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#10243a] via-[#153149] to-[#112c3c] p-6">
          <Badge className="bg-cyan-500/20 text-cyan-100 border-cyan-300/30">
            {isZh ? "订阅计划" : "Subscription Plans"}
          </Badge>
          <h1 className="text-3xl font-bold text-slate-100 mt-3">
            {isZh ? "升级为高级版以获得团队访问权限、多项目工作以及更高的限额" : "Upgrade to Premium for Team Access, Multi-project Work, and Higher Limits"}
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-3xl">
            {isZh
              ? "免费用户最多可以创建1个项目，不能删除项目，不能使用团队功能，最多可以从社区产集中添加2个产集到我的产集中。高级用户可获得团队访问权限、多项目创建、项目删除以及更高的协作限额。"
              : "Free users can create up to 1 project, cannot delete projects, cannot use Team, and can add at most 2 packages from Community Packages into My Packages. Premium users get Team access, multi-project creation, project deletion, and higher collaboration limits."}
          </p>
        </div>

        <Card className="border-slate-700/50 bg-[#0a1528]">
          <CardHeader>
            <CardTitle className="text-slate-100">{isZh ? "功能对比" : "Feature Comparison"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-slate-700/60">
                    <th className="px-3 py-2 text-slate-300">{isZh ? "功能" : "Capability"}</th>
                    <th className="px-3 py-2 text-slate-300">{isZh ? "免费版" : "Free"}</th>
                    <th className="px-3 py-2 text-amber-300">{isZh ? "高级" : "Premium"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "项目创建限制" : "Project creation limit"}</td>
                    <td className="px-3 py-2 text-slate-400">1</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "无限" : "Unlimited"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "删除项目" : "Delete project"}</td>
                    <td className="px-3 py-2 text-rose-300">{isZh ? "不可用" : "Not available"}</td>
                    <td className="px-3 py-2 text-emerald-300">{isZh ? "需要确认后可用" : "Available with confirmation"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "团队/项目成员管理" : "Team / Project member management"}</td>
                    <td className="px-3 py-2 text-rose-300">{isZh ? "不支持" : "Not available"}</td>
                    <td className="px-3 py-2 text-emerald-300">{isZh ? "可用" : "Available"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "添加到我的产集的社区产集" : "Community Packages added to My Packages"}</td>
                    <td className="px-3 py-2 text-slate-400">{isZh ? "最多2个产集" : "Up to 2 packages"}</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "更高限额" : "Higher limit"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-300">{isZh ? "优先支持" : "Priority support"}</td>
                    <td className="px-3 py-2 text-slate-400">{isZh ? "标准" : "Standard"}</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "优先级" : "Priority"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100">{isZh ? "PayPal" : "PayPal"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300">
                {isZh ? "使用PayPal订阅高级版：" : "Subscribe to Premium using PayPal:"}
              </p>
              <div id={PAYPAL_CONTAINER_ID} />
              <a
                href="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-5B02189379420942WNHSA4GA"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-300 hover:text-cyan-200 underline"
              >
                {isZh ? "备用直接订阅链接" : "Fallback direct subscription link"}
              </a>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100">{isZh ? "微信支付" : "WeChat Pay"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isZh
                  ? "请添加 wenrenws 为微信好友，并备注“Premium 升级”。"
                  : "Please add wenrenws as a WeChat friend and mention \"Premium upgrade\"."}
              </p>
              <div className="mt-4 inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {isZh ? "微信联系：wenrenws" : "WeChat contact: wenrenws"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
