import type {
  OfferCompensationDTO,
  OfferWorkplaceFactorsDTO,
  OfferWeightsDTO,
  OfferEvaluationDTO,
  OfferComparisonMatrixDTO,
  CounterOfferScriptDTO,
  CounterOfferNegotiationInput,
  NegotiationTone
} from './types.ts';

export function calculateAnnualTotalCompensation(input: {
  baseSalaryMonthly: number;
  currency?: 'VND' | 'USD';
  bonusMonthsPerYear?: number;
  annualBonusCash?: number;
  stockOptionsOrEquityAnnual?: number;
  allowanceMonthly?: number;
}): OfferCompensationDTO {
  const currency = input.currency || 'VND';
  const baseSalaryMonthly = Math.max(0, Math.round(input.baseSalaryMonthly));
  const bonusMonthsPerYear = Math.max(0, Number(input.bonusMonthsPerYear ?? 1));
  const annualBonusCash = Math.max(0, Math.round(input.annualBonusCash ?? 0));
  const stockOptionsOrEquityAnnual = Math.max(0, Math.round(input.stockOptionsOrEquityAnnual ?? 0));
  const allowanceMonthly = Math.max(0, Math.round(input.allowanceMonthly ?? 0));

  const annualBase = baseSalaryMonthly * 12;
  const annualBonusMonths = baseSalaryMonthly * bonusMonthsPerYear;
  const annualAllowance = allowanceMonthly * 12;
  const annualTotalCompensation = annualBase + annualBonusMonths + annualAllowance + annualBonusCash + stockOptionsOrEquityAnnual;

  return {
    baseSalaryMonthly,
    currency,
    bonusMonthsPerYear,
    annualBonusCash,
    stockOptionsOrEquityAnnual,
    allowanceMonthly,
    annualTotalCompensation
  };
}

export function evaluateOfferDetails(params: {
  applicationId?: string;
  company: string;
  position: string;
  compensation: OfferCompensationDTO;
  workplaceFactors?: Partial<OfferWorkplaceFactorsDTO>;
  weights?: Partial<OfferWeightsDTO>;
}): OfferEvaluationDTO {
  const { company, position, compensation, applicationId } = params;

  const workplaceFactors: OfferWorkplaceFactorsDTO = {
    workLifeBalance: Math.min(10, Math.max(1, params.workplaceFactors?.workLifeBalance ?? 7)),
    careerGrowth: Math.min(10, Math.max(1, params.workplaceFactors?.careerGrowth ?? 7)),
    teamAndCulture: Math.min(10, Math.max(1, params.workplaceFactors?.teamAndCulture ?? 7)),
    remoteFlexibility: Math.min(10, Math.max(1, params.workplaceFactors?.remoteFlexibility ?? 7)),
    companyReputationAndStability: Math.min(10, Math.max(1, params.workplaceFactors?.companyReputationAndStability ?? 7)),
    healthAndBenefits: Math.min(10, Math.max(1, params.workplaceFactors?.healthAndBenefits ?? 7))
  };

  const weights: OfferWeightsDTO = {
    compensationWeight: Math.max(1, params.weights?.compensationWeight ?? 40),
    careerGrowthWeight: Math.max(1, params.weights?.careerGrowthWeight ?? 20),
    workLifeBalanceWeight: Math.max(1, params.weights?.workLifeBalanceWeight ?? 15),
    cultureWeight: Math.max(1, params.weights?.cultureWeight ?? 10),
    remoteWeight: Math.max(1, params.weights?.remoteWeight ?? 10),
    benefitsWeight: Math.max(1, params.weights?.benefitsWeight ?? 5)
  };

  let compScore = 60;
  if (compensation.currency === 'USD') {
    compScore = Math.min(100, Math.max(20, Math.round((compensation.baseSalaryMonthly / 3500) * 85)));
  } else {
    compScore = Math.min(100, Math.max(20, Math.round((compensation.baseSalaryMonthly / 50000000) * 85)));
  }

  const totalWeight =
    weights.compensationWeight +
    weights.careerGrowthWeight +
    weights.workLifeBalanceWeight +
    weights.cultureWeight +
    weights.remoteWeight +
    weights.benefitsWeight;

  const rawWeightedScore =
    (compScore * weights.compensationWeight +
      workplaceFactors.careerGrowth * 10 * weights.careerGrowthWeight +
      workplaceFactors.workLifeBalance * 10 * weights.workLifeBalanceWeight +
      workplaceFactors.teamAndCulture * 10 * weights.cultureWeight +
      workplaceFactors.remoteFlexibility * 10 * weights.remoteWeight +
      workplaceFactors.healthAndBenefits * 10 * weights.benefitsWeight) /
    totalWeight;

  const weightedScore = Math.round(rawWeightedScore * 10) / 10;

  let grade: 'Xuất sắc' | 'Tốt' | 'Cân nhắc' | 'Không khuyến nghị' = 'Cân nhắc';
  if (weightedScore >= 85) grade = 'Xuất sắc';
  else if (weightedScore >= 70) grade = 'Tốt';
  else if (weightedScore >= 55) grade = 'Cân nhắc';
  else grade = 'Không khuyến nghị';

  const pros: string[] = [];
  const cons: string[] = [];

  if (compScore >= 75) {
    pros.push('Mức thù lao và tổng thu nhập (TC) rất cạnh tranh so với mặt bằng thị trường.');
  } else if (compScore < 50) {
    cons.push('Mức lương cơ bản còn thấp hơn kỳ vọng trung bình ngành.');
  }

  if (workplaceFactors.workLifeBalance >= 8) {
    pros.push('Cân bằng công việc và cuộc sống lý tưởng, ít tăng ca đột xuất.');
  } else if (workplaceFactors.workLifeBalance <= 5) {
    cons.push('Áp lực tiến độ cao, có thể yêu cầu làm thêm giờ thường xuyên.');
  }

  if (workplaceFactors.careerGrowth >= 8) {
    pros.push('Lộ trình thăng tiến rõ ràng, cơ hội dẫn dắt dự án và nâng cao kỹ thuật.');
  } else if (workplaceFactors.careerGrowth <= 5) {
    cons.push('Không gian phát triển chuyên môn có thể bị giới hạn.');
  }

  if (workplaceFactors.remoteFlexibility >= 8) {
    pros.push('Chính sách làm việc linh hoạt (Remote / Hybrid) tiết kiệm thời gian di chuyển.');
  } else if (workplaceFactors.remoteFlexibility <= 4) {
    cons.push('Yêu cầu làm việc 100% tại văn phòng cố định.');
  }

  if (workplaceFactors.healthAndBenefits >= 8) {
    pros.push('Chương trình bảo hiểm sức khỏe toàn diện và gói phụ cấp ưu đãi.');
  }

  if (pros.length === 0) {
    pros.push('Cơ hội thử thách mới tại doanh nghiệp đang mở rộng quy mô.');
  }
  if (cons.length === 0) {
    cons.push('Cần kiểm tra kỹ các điều khoản ràng buộc và thời hạn thử việc.');
  }

  const monthlyGross = compensation.baseSalaryMonthly + compensation.allowanceMonthly;
  const annualGuaranteed = compensation.baseSalaryMonthly * 12 + compensation.allowanceMonthly * 12;
  const annualVariable =
    compensation.annualTotalCompensation - annualGuaranteed;

  return {
    applicationId,
    company,
    position,
    compensation,
    workplaceFactors,
    weights,
    weightedScore,
    grade,
    pros,
    cons,
    breakdownSummary: {
      monthlyGross,
      annualGuaranteed,
      annualVariable: Math.max(0, annualVariable),
      annualTotal: compensation.annualTotalCompensation
    }
  };
}

export function compareOffers(offers: OfferEvaluationDTO[]): OfferComparisonMatrixDTO {
  if (offers.length === 0) {
    return {
      offers: [],
      rankedOffers: [],
      recommendationSummary: 'Chưa có lời mời làm việc nào để so sánh.'
    };
  }

  const sorted = [...offers].sort((a, b) => b.weightedScore - a.weightedScore);
  const bestScore = sorted[0]?.weightedScore || 0;

  const rankedOffers = sorted.map((offer, idx) => ({
    offer,
    rank: idx + 1,
    deltaScore: Math.round((offer.weightedScore - bestScore) * 10) / 10
  }));

  const bestOverall = sorted[0];

  const sortedByTC = [...offers].sort(
    (a, b) => b.compensation.annualTotalCompensation - a.compensation.annualTotalCompensation
  );
  const bestCompensation = sortedByTC[0];

  const sortedByWLB = [...offers].sort(
    (a, b) => b.workplaceFactors.workLifeBalance - a.workplaceFactors.workLifeBalance
  );
  const bestWLB = sortedByWLB[0];

  let summary = '';
  if (bestOverall) {
    summary = `Lựa chọn dẫn đầu theo trọng số cá nhân là **${bestOverall.company}** với điểm tổng hợp ${bestOverall.weightedScore}/100. `;
    if (bestCompensation && bestCompensation.company !== bestOverall.company) {
      summary += `Nếu ưu tiên tối đa hóa tài chính trước mắt, **${bestCompensation.company}** mang lại tổng thu nhập cao nhất. `;
    }
    if (bestWLB && bestWLB.company !== bestOverall.company && bestWLB.workplaceFactors.workLifeBalance >= 8) {
      summary += `Ngược lại, **${bestWLB.company}** nổi bật với văn hóa cân bằng cuộc sống và độ linh hoạt cao nhất. `;
    }
  }

  return {
    offers,
    rankedOffers,
    bestOverallOfferId: bestOverall?.applicationId || bestOverall?.company,
    bestCompensationOfferId: bestCompensation?.applicationId || bestCompensation?.company,
    bestWorkLifeBalanceOfferId: bestWLB?.applicationId || bestWLB?.company,
    recommendationSummary: summary.trim()
  };
}

function formatSalary(amount: number, currency: 'VND' | 'USD'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  return `${amount.toLocaleString('vi-VN')} VND`;
}

export function generateCounterOfferScript(
  input: CounterOfferNegotiationInput
): CounterOfferScriptDTO {
  const { offer, targetSalary } = input;
  const tone: NegotiationTone = input.tone || 'polite_confident';
  const curr = offer.compensation.currency;
  const currentBase = offer.compensation.baseSalaryMonthly;
  const targetFormatted = formatSalary(targetSalary, curr);
  const currentFormatted = formatSalary(currentBase, curr);

  const diff = targetSalary - currentBase;
  const targetIncreasePercent =
    currentBase > 0 ? Math.round((diff / currentBase) * 100) : 0;

  let emailSubject = '';
  let emailBody = '';
  let shortScriptForCall = '';
  const talkingPoints: string[] = [];
  const leverageItems: string[] = [];

  talkingPoints.push(
    `Năng lực chuyên môn vững chắc và kinh nghiệm giải quyết trực tiếp các bài toán công nghệ tại vị trí ${offer.position}.`
  );
  talkingPoints.push(
    `Khả năng hòa nhập nhanh và đóng góp hiệu quả vào mục tiêu kinh doanh của ${offer.company} ngay từ tháng đầu tiên.`
  );

  if (input.keyStrengths && input.keyStrengths.length > 0) {
    talkingPoints.push(
      `Các thế mạnh nổi bật: ${input.keyStrengths.slice(0, 3).join(', ')}.`
    );
  }

  if (input.competitiveOffer) {
    const compTC = formatSalary(
      input.competitiveOffer.annualTotalCompensation,
      curr
    );
    leverageItems.push(
      `Đang có lời mời làm việc song song từ ${input.competitiveOffer.company} với mức đãi ngộ hấp dẫn (${compTC}/năm).`
    );
    leverageItems.push(
      `${offer.company} vẫn là sự lựa chọn ưu tiên hàng đầu nếu giải tỏa được khoảng cách về thù lao.`
    );
  } else {
    leverageItems.push(
      'Mặt bằng lương thị trường theo khảo sát ngành cho cùng cấp bậc và số năm kinh nghiệm.'
    );
    leverageItems.push(
      'Cam kết cam kết gắn bó lâu dài và tạo ra giá trị đo lường được cho dự án trọng điểm.'
    );
  }

  if (tone === 'polite_confident') {
    emailSubject = `Thư cảm ơn & Trao đổi thêm về đãi ngộ cho vị trí ${offer.position} — ${offer.company}`;
    emailBody =
      `Kính gửi Bộ phận Tuyển dụng và Ban Giám đốc ${offer.company},\n\n` +
      `Tôi xin chân thành cảm ơn Quý công ty đã dành thời gian phỏng vấn và trao cho tôi cơ hội gia nhập đội ngũ với vị trí ${offer.position}. Tôi rất ấn tượng với định hướng phát triển cũng như văn hóa làm việc chuyên nghiệp tại ${offer.company}.\n\n` +
      `Sau khi cân nhắc kỹ lưỡng các điều khoản trong thư mời làm việc (Offer Letter), tôi hoàn toàn tin tưởng vào khả năng tạo ra giá trị đóng góp tích cực và nhanh chóng cho dự án. Tuy nhiên, căn cứ vào mặt bằng thị trường cho vị trí này cùng với các kỹ năng chuyên môn tôi có thể mang lại, tôi mong muốn được trao đổi thêm về mức lương cơ bản.\n\n` +
      `Nếu có thể điều chỉnh mức lương cơ bản lên ${targetFormatted}/tháng (tăng ${targetIncreasePercent}% so với đề xuất ban đầu ${currentFormatted}/tháng), tôi sẽ vô cùng phấn khởi và sẵn sàng ký xác nhận nhận việc ngay trong tuần này.\n\n` +
      `Tôi rất mong nhận được phản hồi từ Quý công ty và luôn sẵn sàng trao đổi thêm qua điện thoại nếu cần.\n\n` +
      `Trân trọng,\n[Họ và tên của bạn]\n[Số điện thoại liên hệ]`;

    shortScriptForCall =
      `"Em rất vui và cảm kích khi nhận được offer từ ${offer.company}. Em hoàn toàn tin tưởng sẽ hoàn thành xuất sắc các mục tiêu ở vị trí ${offer.position}. Sau khi xem xét kỹ, em rất mong công ty có thể cân nhắc nâng mức lương cơ bản lên ${targetFormatted}/tháng để phản ánh đúng năng lực và mặt bằng thị trường. Nếu đạt được con số này, em xin phép chốt nhận việc ngay lập tức ạ!"`;
  } else if (tone === 'collaborative') {
    emailSubject = `Trao đổi về thư mời làm việc vị trí ${offer.position} — ${offer.company}`;
    emailBody =
      `Kính gửi Đội ngũ Tuyển dụng ${offer.company},\n\n` +
      `Tôi xin bày tỏ sự cảm ơn sâu sắc vì lời mời làm việc cho vị trí ${offer.position}. Được đồng hành cùng ${offer.company} là mục tiêu mà tôi rất hào hứng theo đuổi.\n\n` +
      `Để đảm bảo sự gắn kết lâu dài và tối ưu hiệu quả công việc, tôi mong muốn chúng ta cùng thảo luận linh hoạt về cấu trúc đãi ngộ. Mục tiêu thu nhập mà tôi đang hướng tới là khoảng ${targetFormatted}/tháng.\n\n` +
      `Tôi rất cởi mở xem xét các phương án kết hợp như điều chỉnh lương cứng, bổ sung thưởng theo KPI dự án hoặc tăng số ngày làm việc linh hoạt (Remote/Hybrid) để hai bên cùng đạt được tiếng nói chung.\n\n` +
      `Rất mong có cơ hội trao đổi ngắn qua điện thoại với Quý công ty để thống nhất phương án phù hợp nhất.\n\n` +
      `Trân trọng,\n[Họ và tên của bạn]`;

    shortScriptForCall =
      `"Cảm ơn anh/chị vì lời mời gia nhập ${offer.company}. Em rất mong muốn được cống hiến lâu dài cùng team. Em muốn trao đổi thêm về gói đãi ngộ, kỳ vọng của em là khoảng ${targetFormatted}/tháng, nhưng em rất cởi mở thảo luận các phương án linh hoạt giữa lương cứng, thưởng hiệu quả và phúc lợi làm việc từ xa để hài hòa cho cả hai bên ạ."`;
  } else {
    const compText = input.competitiveOffer
      ? `Hiện tại tôi cũng đã nhận được thư mời làm việc với mức đãi ngộ hấp dẫn từ ${input.competitiveOffer.company}. Tuy nhiên, ${offer.company} luôn là môi trường mà tôi đánh giá cao hơn về định hướng công nghệ và sản phẩm.`
      : `Với những kết quả định lượng cụ thể mà tôi đã chứng minh qua các vòng phỏng vấn, tôi tin tưởng mức thù lao đề xuất sẽ đem lại sự tương xứng cho đôi bên.`;

    emailSubject = `Đề xuất thảo luận điều chỉnh thù lao vị trí ${offer.position} — ${offer.company}`;
    emailBody =
      `Kính gửi Ban Tuyển dụng ${offer.company},\n\n` +
      `Cảm ơn Quý công ty đã gửi thư mời nhận việc vị trí ${offer.position}.\n\n` +
      `${compText}\n\n` +
      `Để đưa ra quyết định dứt khoát và gắn bó toàn tâm cùng ${offer.company}, tôi đề xuất điều chỉnh mức lương cơ bản lên ${targetFormatted}/tháng. Đây là mức thù lao giúp tôi yên tâm cống hiến và tập trung 100% năng lượng vào các mục tiêu bứt phá của công ty.\n\n` +
      `Rất mong nhận được phản hồi chính thức từ Quý công ty trong thời gian sớm nhất.\n\n` +
      `Trân trọng,\n[Họ và tên của bạn]`;

    shortScriptForCall =
      `"Em rất tôn trọng cơ hội tại ${offer.company}. Hiện tại em đang có lựa chọn cạnh tranh khác, nhưng em ưu tiên ${offer.company} hơn. Nếu công ty có thể điều chỉnh thù lao lên ${targetFormatted}/tháng, em sẽ từ chối các nơi khác để ký hợp đồng chính thức với bên mình ngay hôm nay ạ."`;
  }

  const walkAwayAdvice =
    diff > 0
      ? `Điểm dừng an toàn (Walk-away Threshold): Nếu nhà tuyển dụng không thể đáp ứng 100% con số ${targetFormatted}, mức tối thiểu bạn nên chấp nhận là ${formatSalary(Math.round(currentBase + diff * 0.5), curr)} đi kèm cam kết xét lương sớm sau 6 tháng thử việc.`
      : 'Mức lương hiện tại đã ở ngưỡng tốt. Hãy tập trung đàm phán thêm số ngày nghỉ phép, phụ cấp thiết bị hoặc ngân sách đào tạo cá nhân.';

  return {
    tone,
    targetSalary,
    targetIncreasePercent,
    emailSubject,
    emailBody,
    shortScriptForCall,
    talkingPoints,
    leverageItems,
    walkAwayAdvice
  };
}
