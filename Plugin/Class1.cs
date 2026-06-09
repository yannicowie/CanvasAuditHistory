using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Crm.Sdk.Messages;

namespace Yc.Plugins
{
    public class RetrieveCanvasAuditHistoryVirtual : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var factory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = factory.CreateOrganizationService(context.UserId);

            if (context.MessageName.ToLower() != "retrievemultiple") return;

            var query = context.InputParameters["Query"] as QueryExpression;
            var collection = new EntityCollection { EntityName = "yc_canvasaudithistory" };

            string targetIdStr = GetFilterValue(query?.Criteria, "yc_targetid");
            string logicalName = GetFilterValue(query?.Criteria, "yc_tablename");

            if (string.IsNullOrWhiteSpace(targetIdStr) || string.IsNullOrWhiteSpace(logicalName) || !Guid.TryParse(targetIdStr, out Guid targetId))
            {
                context.OutputParameters["BusinessEntityCollection"] = collection;
                return;
            }

            try
            {
                // Fetch Entity Metadata to get the choice labels and display names
                var metaRequest = new RetrieveEntityRequest
                {
                    LogicalName = logicalName,
                    EntityFilters = EntityFilters.Attributes
                };
                var metaResponse = (RetrieveEntityResponse)service.Execute(metaRequest);
                var attributesMeta = metaResponse.EntityMetadata.Attributes;

                var request = new RetrieveRecordChangeHistoryRequest
                {
                    Target = new EntityReference(logicalName, targetId)
                };

                var response = (RetrieveRecordChangeHistoryResponse)service.Execute(request);
                var dtoList = new List<AuditRecordDto>();

                foreach (var detail in response.AuditDetailCollection.AuditDetails)
                {
                    if (detail is AttributeAuditDetail attrDetail)
                    {
                        var dto = new AuditRecordDto
                        {
                            AuditId = detail.AuditRecord.Id.ToString(),
                            CreatedOn = detail.AuditRecord.GetAttributeValue<DateTime?>("createdon"),
                            UserId = GetEntityReferenceName(detail.AuditRecord, "userid"),
                            Operation = detail.AuditRecord.FormattedValues.Contains("operation") ? detail.AuditRecord.FormattedValues["operation"] : detail.AuditRecord.GetAttributeValue<OptionSetValue>("operation")?.Value.ToString(),
                            Action = detail.AuditRecord.FormattedValues.Contains("action") ? detail.AuditRecord.FormattedValues["action"] : detail.AuditRecord.GetAttributeValue<OptionSetValue>("action")?.Value.ToString(),
                            Changes = new List<AuditChangeDto>()
                        };

                        var newKeys = attrDetail.NewValue?.Attributes.Keys ?? Enumerable.Empty<string>();
                        var oldKeys = attrDetail.OldValue?.Attributes.Keys ?? Enumerable.Empty<string>();
                        var allKeys = newKeys.Union(oldKeys).Distinct();

                        foreach (var key in allKeys)
                        {
                            object oldVal = attrDetail.OldValue?.Contains(key) == true ? attrDetail.OldValue[key] : null;
                            object newVal = attrDetail.NewValue?.Contains(key) == true ? attrDetail.NewValue[key] : null;

                            var attrMeta = attributesMeta.FirstOrDefault(a => a.LogicalName == key);
                            string dispName = attrMeta?.DisplayName?.UserLocalizedLabel?.Label;

                            dto.Changes.Add(new AuditChangeDto
                            {
                                Attribute = key,
                                AttributeDisplayName = !string.IsNullOrEmpty(dispName) ? dispName : key,
                                OldValue = GetFormattedValue(oldVal, attrMeta),
                                NewValue = GetFormattedValue(newVal, attrMeta)
                            });
                        }
                        dtoList.Add(dto);
                    }
                }

                string jsonResponse = string.Empty;
                var serializer = new DataContractJsonSerializer(typeof(List<AuditRecordDto>));
                using (var ms = new MemoryStream())
                {
                    serializer.WriteObject(ms, dtoList);
                    jsonResponse = Encoding.UTF8.GetString(ms.ToArray());
                }

                var entity = new Entity("yc_canvasaudithistory")
                {
                    Id = Guid.NewGuid()
                };
                entity["yc_canvasaudithistoryid"] = entity.Id;
                entity["yc_targetid"] = targetIdStr;
                entity["yc_tablename"] = logicalName;
                entity["yc_auditpayload"] = jsonResponse;

                collection.Entities.Add(entity);
                context.OutputParameters["BusinessEntityCollection"] = collection;
            }
            catch
            {
                context.OutputParameters["BusinessEntityCollection"] = collection;
            }
        }

        private string GetFilterValue(FilterExpression filter, string attributeName)
        {
            if (filter == null) return null;
            foreach (var condition in filter.Conditions)
            {
                if (condition.AttributeName == attributeName && condition.Values.Count > 0)
                    return condition.Values[0].ToString();
            }
            foreach (var childFilter in filter.Filters)
            {
                var val = GetFilterValue(childFilter, attributeName);
                if (val != null) return val;
            }
            return null;
        }

        private string GetEntityReferenceName(Entity entity, string attributeName)
        {
            var er = entity.GetAttributeValue<EntityReference>(attributeName);
            return er?.Name ?? er?.Id.ToString() ?? string.Empty;
        }

        private string GetFormattedValue(object attrValue, AttributeMetadata meta)
        {
            if (attrValue == null) return string.Empty;
            if (attrValue is EntityReference er) return er.Name ?? er.Id.ToString();

            if (attrValue is OptionSetValue osv)
            {
                if (meta is EnumAttributeMetadata enumMeta && enumMeta.OptionSet != null)
                {
                    var option = enumMeta.OptionSet.Options.FirstOrDefault(o => o.Value == osv.Value);
                    if (option != null && option.Label?.UserLocalizedLabel != null)
                        return option.Label.UserLocalizedLabel.Label;
                }
                return osv.Value.ToString();
            }

            if (attrValue is bool bVal)
            {
                if (meta is BooleanAttributeMetadata boolMeta && boolMeta.OptionSet != null)
                {
                    var option = bVal ? boolMeta.OptionSet.TrueOption : boolMeta.OptionSet.FalseOption;
                    if (option != null && option.Label?.UserLocalizedLabel != null)
                        return option.Label.UserLocalizedLabel.Label;
                }
                return bVal.ToString();
            }

            if (attrValue is Money m) return m.Value.ToString();
            if (attrValue is AliasedValue av) return GetFormattedValue(av.Value, meta);
            return attrValue.ToString();
        }
    }

    [DataContract]
    public class AuditRecordDto
    {
        [DataMember(Name = "auditId")] public string AuditId { get; set; }
        [DataMember(Name = "createdOn")] public DateTime? CreatedOn { get; set; }
        [DataMember(Name = "userId")] public string UserId { get; set; }
        [DataMember(Name = "operation")] public string Operation { get; set; }
        [DataMember(Name = "action")] public string Action { get; set; }
        [DataMember(Name = "changes")] public List<AuditChangeDto> Changes { get; set; }
    }

    [DataContract]
    public class AuditChangeDto
    {
        [DataMember(Name = "attribute")] public string Attribute { get; set; }
        [DataMember(Name = "attributeDisplayName")] public string AttributeDisplayName { get; set; } // Added new parameter
        [DataMember(Name = "oldValue")] public string OldValue { get; set; }
        [DataMember(Name = "newValue")] public string NewValue { get; set; }
    }
}